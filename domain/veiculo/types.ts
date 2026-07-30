export type VeiculoStatus = "Ativo" | "Inativo" | "Manutencao";

export interface Veiculo {
  id: string;
  model: string;
  plate: string;
  year: string;
  color: string;
  status: VeiculoStatus;
  createdAt: string;
}

export interface VeiculoForm extends Omit<Veiculo, "id" | "createdAt"> {}
