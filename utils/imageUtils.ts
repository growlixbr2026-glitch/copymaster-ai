
/**
 * Redimensiona e comprime uma imagem do lado do cliente para economizar tokens e banda.
 * Utiliza createImageBitmap para evitar bloqueio da thread principal.
 * @param file O arquivo de imagem a ser processado.
 * @param maxSize A dimensão máxima (largura ou altura). Padrão 800px.
 * @returns Uma Promise que resolve com a string base64 otimizada.
 */
export const resizeImage = async (file: File, maxSize: number = 800): Promise<string> => {
  try {
    // createImageBitmap é assíncrono e muito mais rápido que new Image()
    const bitmap = await createImageBitmap(file);
    
    let width = bitmap.width;
    let height = bitmap.height;

    // Calcula as novas dimensões
    if (width > height) {
      if (width > maxSize) {
        height = Math.round(height * (maxSize / width));
        width = maxSize;
      }
    } else {
      if (height > maxSize) {
        width = Math.round(width * (maxSize / height));
        height = maxSize;
      }
    }

    // Usa OffscreenCanvas se disponível (Web Worker friendly) ou Canvas normal
    let canvas: HTMLCanvasElement | OffscreenCanvas;
    let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

    if (typeof OffscreenCanvas !== 'undefined') {
        canvas = new OffscreenCanvas(width, height);
        ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
    } else {
        canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    }

    if (!ctx) {
      throw new Error('Não foi possível obter o contexto 2D do canvas.');
    }

    // Fundo branco para transparências
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close(); // Libera memória do bitmap imediatamente

    // Retorna blob ou dataURL
    if (canvas instanceof OffscreenCanvas) {
        const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.6 });
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    } else {
        return (canvas as HTMLCanvasElement).toDataURL('image/jpeg', 0.6);
    }

  } catch (error) {
    console.error("Erro na otimização de imagem:", error);
    throw new Error("Falha ao processar imagem. Tente um arquivo menor.");
  }
};
