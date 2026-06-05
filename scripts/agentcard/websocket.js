import crypto from "node:crypto";

const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

export function createSnapshotBroadcaster() {
  const sockets = new Set();

  return {
    accept(request, socket, head, snapshot) {
      if (head?.length) socket.unshift(head);
      const key = request.headers["sec-websocket-key"];
      if (!key) {
        socket.destroy();
        return;
      }

      const accept = crypto
        .createHash("sha1")
        .update(`${key}${WS_GUID}`)
        .digest("base64");

      socket.write(
        [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${accept}`,
          "",
          ""
        ].join("\r\n")
      );

      sockets.add(socket);
      socket.on("close", () => sockets.delete(socket));
      socket.on("error", () => sockets.delete(socket));
      socket.on("data", (data) => {
        if (data.length < 2) return;
        const opcode = data.readUInt8(0) & 0x0f;
        if (opcode === 0x09) {
          // Ping → respond Pong
          socket.write(encodeControlFrame(0x0a));
        } else if (opcode === 0x08) {
          // Close → ack and destroy
          socket.write(encodeControlFrame(0x08));
          socket.destroy();
        }
        // Ignore text frames (0x01), continuation (0x00), and unknown opcodes
      });
      send(socket, snapshot);
    },

    broadcast(snapshot) {
      for (const socket of sockets) {
        send(socket, snapshot);
      }
    }
  };
}

function send(socket, value) {
  if (socket.destroyed) return;
  socket.write(encodeFrame(JSON.stringify(value)));
}

function encodeControlFrame(opcode) {
  // RFC 6455: control frames have FIN + opcode, zero-length payload
  return Buffer.from([0x80 | opcode, 0x00]);
}

function encodeFrame(text) {
  const payload = Buffer.from(text);
  const length = payload.length;

  if (length < 126) {
    return Buffer.concat([Buffer.from([0x81, length]), payload]);
  }

  if (length < 65536) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
    return Buffer.concat([header, payload]);
  }

  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(length), 2);
  return Buffer.concat([header, payload]);
}
