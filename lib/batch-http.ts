import { NextResponse } from "next/server";
import {
  BatchNoEligibleCompaniesError,
  BatchConfigurationError,
  BatchForbiddenError,
  BatchRunConflictError,
  BatchRunInvalidStateError,
  BatchRunNotFoundError,
  BatchRunPausedError,
  BatchUnauthorizedError,
  BatchValidationError,
} from "@/domain/autoprospect/batch";

/** Mapeamento de erros de domínio do lote para respostas HTTP
 *  (padrão da casa: { ok, error, detail }). */
export function batchErrorResponse(error: unknown, context: string): NextResponse {
  if (error instanceof BatchUnauthorizedError) {
    return NextResponse.json(
      { ok: false, error: context, detail: error.message },
      { status: 401 },
    );
  }
  if (error instanceof BatchForbiddenError) {
    return NextResponse.json(
      { ok: false, error: context, detail: error.message },
      { status: 403 },
    );
  }
  if (error instanceof BatchConfigurationError) {
    return NextResponse.json(
      { ok: false, error: context, detail: error.message },
      { status: 503 },
    );
  }
  if (error instanceof BatchValidationError) {
    return NextResponse.json(
      { ok: false, error: context, detail: error.message },
      { status: 400 },
    );
  }
  if (error instanceof BatchRunConflictError || error instanceof BatchNoEligibleCompaniesError) {
    return NextResponse.json(
      { ok: false, error: context, detail: error.message },
      { status: 409 },
    );
  }
  if (error instanceof BatchRunNotFoundError) {
    return NextResponse.json(
      { ok: false, error: context, detail: error.message },
      { status: 404 },
    );
  }
  if (error instanceof BatchRunPausedError || error instanceof BatchRunInvalidStateError) {
    return NextResponse.json(
      { ok: false, error: context, detail: error.message },
      { status: 409 },
    );
  }
  console.error("[Auto Prospect] Falha no processamento em lote:", error);
  return NextResponse.json(
    { ok: false, error: context, detail: "Não foi possível concluir a operação no momento. Tente novamente." },
    { status: 502 },
  );
}
