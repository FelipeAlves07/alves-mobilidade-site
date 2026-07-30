export type MotoristaStatus = "Ativo" | "Inativo" | "Ferias";

export interface Motorista {
  id: string;
  name: string;
  phone: string;
  cnh: string;
  cpf: string;
  status: MotoristaStatus;
  createdAt: string;
}

export interface MotoristaForm extends Omit<Motorista, "id" | "createdAt"> {}
