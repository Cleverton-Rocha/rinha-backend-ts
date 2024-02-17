export type ParamsType = {
  id: string
}

export type BodyType = {
  valor: number
  tipo: 'd' | 'c'
  descricao: string
}

export type Saldo = {
  total: number
  data_extrato: string
  limite: number
}

export type Transacao = {
  valor: number
  tipo: 'c' | 'd'
  descricao: string
  realizada_em: Date
}

export type Extrato = {
  saldo: Saldo
  ultimas_transacoes: Transacao[]
}
