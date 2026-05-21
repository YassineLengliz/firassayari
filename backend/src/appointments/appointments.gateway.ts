import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";

@WebSocketGateway({ cors: { origin: "*" }, namespace: "appointments" })
export class AppointmentsGateway {
  @WebSocketServer()
  server!: Server;

  broadcastRefresh() {
    this.server.emit("appointments:refresh");
  }
}
