export type Trip = {
  id: string;
  client: string;
  phone: string;
  date: string;
  time: string;
  route: string;
  value: number;
  status: "Agendada" | "Concluída" | "Cancelada";
};