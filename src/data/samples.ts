import type { ReportPreset } from "@/lib/format/types";

export interface SampleReport {
  id: string;
  label: string;
  preset: ReportPreset;
  text: string;
}

export const SAMPLE_REPORTS: SampleReport[] = [
  {
    id: "anatomopatologico-gastrico",
    label: "Biópsia gástrica",
    preset: "generico",
    text: [
      "ANATOMOPATOLÓGICO",
      "Paciente: Exemplo Fictício, 45 anos",
      "Registro: 0000000",
      "Material: fragmento de mucosa gástrica obtido por endoscopia digestiva alta.",
      "Microscopia: fragmentos de mucosa gástrica com infiltrado inflamatório crônico leve na lâmina própria. Não se observam metaplasia intestinal, displasia ou malignidade.",
      "Diagnóstico: gastrite crônica não ativa.",
      "Nota: exemplo fictício para demonstração do formatador.",
    ].join("\n"),
  },
  {
    id: "citologia-cervicovaginal",
    label: "Citologia cervicovaginal",
    preset: "citologia",
    text: [
      "CITOLOGIA CERVICOVAGINAL",
      "Paciente: Exemplo Fictício, 38 anos",
      "Registro: 0000000",
      "Material: esfregaço cervicovaginal em meio líquido.",
      "Adequabilidade: satisfatória, com representação da zona de transformação.",
      "Microscopia: células escamosas com alterações inflamatórias inespecíficas. Ausência de atipias malignas.",
      "Conclusão: negativo para lesão intraepitelial ou malignidade.",
      "Nota: exemplo fictício para demonstração do formatador.",
    ].join("\n"),
  },
  {
    id: "imuno-histoquimica-mamaria",
    label: "Imuno-histoquímica mamária",
    preset: "generico",
    text: [
      "IMUNO-HISTOQUÍMICA",
      "Paciente: Exemplo Fictício, 61 anos",
      "Registro: 0000000",
      "Material: bloco de tecido mamário.",
      "Painel: receptor de estrogênio, receptor de progesterona e HER2.",
      "Resultado: receptor de estrogênio positivo em 90% dos núcleos; receptor de progesterona positivo em 70% dos núcleos; HER2 com expressão fraca e incompleta.",
      "Conclusão: perfil imuno-histoquímico fictício para demonstração.",
      "Nota: exemplo fictício para demonstração do formatador.",
    ].join("\n"),
  },
];
