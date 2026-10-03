import { useState } from 'react';
import { analyzeImageContextService, analyzePdfContextService } from '../services/modules/visual/analysis';
import { resizeImage } from '../utils/imageUtils';
import { toFriendlyError } from '../services/friendlyErrors';

/**
 * Análise de arquivo (imagem/PDF) compartilhada — extraída de CopyGenerator e
 * CommentResponder em 2026-10-03 (review da sessão 51: as duas cópias estavam
 * divergindo — uma validava conteúdo vazio, a outra não; uma ligava `onerror`
 * do FileReader, a outra não).
 *
 * Garantias (AGENTS §8 — nenhum erro silencioso):
 * - `FileReader` com `onerror`/`onabort`: falha de leitura REJEITA a promise →
 *   o `finally` roda e o busy é liberado (antes: UI travada até F5).
 * - PDF com checagem MIME + teto de 3 MB: base64 (×4/3) cabe no corpo de 6 MB
 *   do `/api/ai` (413) e arquivo renomeado não vira payload errado.
 * - Análise vazia (ou só a Nota) vira erro visível, nunca "sucesso" mudo.
 * - Toda mensagem passa por `toFriendlyError` (nunca JSON cru na UI).
 */
export const MAX_PDF_BYTES = 3 * 1024 * 1024;

export type FileAnalysisResult =
  | { ok: true; facts: string }
  | { ok: false; error: string };

const readAsDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo localmente.'));
    reader.onabort = () => reject(new Error('Leitura do arquivo cancelada.'));
    reader.readAsDataURL(file);
  });

export const useFileAnalysis = (language: string) => {
  const [analyzingFile, setAnalyzingFile] = useState(false);
  const [fileName, setFileName] = useState('');

  const analyzeFile = async (file: File, type: 'imagem' | 'pdf'): Promise<FileAnalysisResult> => {
    if (type === 'pdf') {
      if (file.type && file.type !== 'application/pdf') {
        return { ok: false, error: 'Envie um arquivo PDF válido — a extensão precisa bater com o conteúdo do arquivo.' };
      }
      if (file.size > MAX_PDF_BYTES) {
        return { ok: false, error: 'PDF muito grande (máx. 3 MB). Cole o texto ou um trecho menor.' };
      }
    } else if (file.type && !file.type.startsWith('image/')) {
      return { ok: false, error: 'Envie um arquivo de imagem válido (PNG, JPG, WEBP...).' };
    }

    setFileName(file.name);
    setAnalyzingFile(true);
    try {
      let analysis = '';
      if (type === 'imagem') {
        const base64 = await resizeImage(file, 1024);
        const res = await analyzeImageContextService(base64, language);
        if (res.error) throw new Error(res.error);
        analysis = res.text;
      } else {
        const base64 = await readAsDataURL(file);
        const res = await analyzePdfContextService(base64, language);
        if (res.error) throw new Error(res.error);
        analysis = res.text;
      }
      // Só os fatos entram na fonte (a Nota isolada da análise não vaza p/ o prompt).
      const facts = (analysis || '').split('|||NOTA_DIVIDER|||')[0].trim();
      if (!facts) {
        setFileName('');
        return { ok: false, error: toFriendlyError('A análise do arquivo veio vazia. Tente outro arquivo ou digite o conteúdo manualmente.') };
      }
      return { ok: true, facts };
    } catch (err: any) {
      setFileName('');
      return { ok: false, error: toFriendlyError(err?.message || 'Não consegui ler o arquivo. Tente novamente.') };
    } finally {
      setAnalyzingFile(false);
    }
  };

  return { analyzingFile, fileName, setFileName, analyzeFile };
};
