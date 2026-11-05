import type { ReportPreset } from "@/lib/format/types";

export interface ReportPresetConfig {
  id: ReportPreset;
  label: string;
  description: string;
  titleKeywords: string[];
  sectionKeywords: string[];
  noteKeywords: string[];
  fieldKeywords: string[];
  signatureKeywords: string[];
  maxItalicSpans: number;
}

const COMMON_SECTION_KEYWORDS = [
  "IDENTIFICACAO",
  "IDENTIFICAÇÃO",
  "DADOS CLINICOS",
  "DADOS CLÍNICOS",
  "MATERIAL",
  "DESCRICAO MICROSCOPICA",
  "DESCRIÇÃO MICROSCÓPICA",
  "DIAGNOSTICO",
  "DIAGNÓSTICO",
  "CONCLUSAO",
  "CONCLUSÃO",
  "OBSERVACOES",
  "OBSERVAÇÕES",
  "RECOMENDACOES",
  "RECOMENDAÇÕES",
  "RESULTADO",
  "METODO",
  "MÉTODO",
  "COMENTARIOS",
  "COMENTÁRIOS",
];

const COMMON_TITLE_KEYWORDS = [
  "LAUDO",
  "EXAME",
  "RELATORIO",
  "RELATÓRIO",
  "CITOLOG",
  "ANATOMOPATOL",
  "HISTOPATOL",
  "RESULTADO DE",
];

const COMMON_NOTE_KEYWORDS = ["NOTA", "OBSERVACAO", "OBSERVAÇÃO", "OBS.", "IMPORTANTE"];

const COMMON_FIELD_KEYWORDS = [
  "PACIENTE",
  "NOME",
  "IDADE",
  "SEXO",
  "DATA",
  "MATERIAL",
  "MEDICO",
  "MÉDICO",
  "SOLICITANTE",
  "CRM",
  "REGISTRO",
  "PRONTUARIO",
  "PRONTUÁRIO",
  "CONVENIO",
  "CONVÊNIO",
  "ATENDIMENTO",
];

const COMMON_SIGNATURE_KEYWORDS = [
  "CRM",
  "CRF",
  "CRBM",
  "MEDICO",
  "MÉDICO",
  "PATOLOGISTA",
  "RESPONSAVEL",
  "RESPONSÁVEL",
  "DR.",
  "DRA.",
  "ASSINADO",
];

const GENERICO: ReportPresetConfig = {
  id: "generico",
  label: "Genérico",
  description: "Estrutura padrão para laudos descritivos.",
  titleKeywords: COMMON_TITLE_KEYWORDS,
  sectionKeywords: COMMON_SECTION_KEYWORDS,
  noteKeywords: COMMON_NOTE_KEYWORDS,
  fieldKeywords: COMMON_FIELD_KEYWORDS,
  signatureKeywords: COMMON_SIGNATURE_KEYWORDS,
  maxItalicSpans: 50,
};

const CITOLOGIA: ReportPresetConfig = {
  ...GENERICO,
  id: "citologia",
  label: "Citologia",
  description: "Preset para laudos citológicos e exames de Papanicolau.",
  sectionKeywords: [
    ...COMMON_SECTION_KEYWORDS,
    "IDENTIFICACAO DA AMOSTRA",
    "IDENTIFICAÇÃO DA AMOSTRA",
    "ADEQUABILIDADE",
    "AMOSTRA",
    "ACHADOS",
    "ACHADOS CITOLOGICOS",
    "ACHADOS CITOLÓGICOS",
    "CORRELACAO",
    "CORRELAÇÃO",
    "CLASSIFICACAO",
    "CLASSIFICAÇÃO",
  ],
};

const PRESETS: Record<ReportPreset, ReportPresetConfig> = {
  generico: GENERICO,
  citologia: CITOLOGIA,
};

export const PRESET_OPTIONS = [CITOLOGIA, GENERICO].map(({ id, label, description }) => ({
  id,
  label,
  description,
}));

export function getPreset(id: ReportPreset | undefined): ReportPresetConfig {
  return id ? PRESETS[id] : GENERICO;
}
