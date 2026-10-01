import { jsPDF } from "jspdf";

export const downloadPDF = (title: string, content: string) => {
  const doc = new jsPDF();
  
  // Configuração de Margens e Tamanho
  const margin = 20;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxLineWidth = pageWidth - (margin * 2);

  // Cabeçalho (Título)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, margin, 20);
  
  // Linha divisória abaixo do título
  doc.setLineWidth(0.5);
  doc.line(margin, 25, pageWidth - margin, 25);

  // Conteúdo
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  
  // Quebra o texto para caber na largura da página
  const textLines = doc.splitTextToSize(content, maxLineWidth);
  
  let cursorY = 35;
  
  textLines.forEach((line: string) => {
    // Verifica se precisa de nova página
    if (cursorY > pageHeight - margin) {
      doc.addPage();
      cursorY = 20; // Reseta cursor para o topo da nova página
    }
    
    doc.text(line, margin, cursorY);
    cursorY += 6; // Espaçamento entre linhas (line-height)
  });
  
  // Rodapé simples com data
  const dateStr = new Date().toLocaleDateString('pt-BR');
  const footerText = `Gerado por CopyMaster AI em ${dateStr}`;
  doc.setFontSize(8);
  doc.setTextColor(150);
  
  // Adiciona rodapé em todas as páginas
  const pageCount = doc.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(footerText, margin, pageHeight - 10);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin - 20, pageHeight - 10);
  }

  // Sanitiza nome do arquivo
  const filename = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`${filename}.pdf`);
};
