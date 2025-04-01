document.addEventListener("DOMContentLoaded", function () {
  // Verificar token e usuário
  const token = localStorage.getItem("token");
  const usuarioStr = localStorage.getItem("usuario");
  
  if (!token || !usuarioStr) {
    alert("Nenhum usuário logado! Faça login primeiro.");
    window.location.href = "/Sistema/pages/login.html";
    return;
  }

  let usuario;
  try {
    usuario = JSON.parse(usuarioStr);
    if (!usuario || !usuario.id || !usuario.nome) {
      throw new Error("Dados do usuário inválidos");
    }
  } catch (error) {
    console.error("Erro ao processar dados do usuário:", error);
    alert("Erro nos dados do usuário. Por favor, faça login novamente.");
    window.location.href = "/pages/login.html";
    return;
  }

  console.log("Usuário logado:", usuario); // Log para debug

  const tabela = document.getElementById("tabela-registros");
  const formEdicao = document.getElementById("form-edicao");
  const editarForm = document.getElementById("editar-form");
  const cancelarEdicaoBtn = document.getElementById("cancelar-edicao");

  let registros = [];
  let registroEditando = null;
  let campoEditando = null;

  // Função para buscar registros do backend
  async function buscarRegistros() {
    try {
      const response = await fetch("http://localhost:3000/registros", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        registros = data.registros;
        exibirRegistros();
      } else {
        const error = await response.json();
        alert(`Erro ao buscar registros: ${error.message}`);
      }
    } catch (err) {
      console.error("Erro ao buscar registros:", err);
      alert("Erro no servidor. Tente novamente mais tarde.");
    }
  }

  // Função para exibir os registros na tabela
  function exibirRegistros() {
    tabela.innerHTML = "";
    if (registros.length === 0) {
        tabela.innerHTML = '<tr><td colspan="5">Nenhum registro encontrado.</td></tr>';
    } else {
        registros.forEach((registro, index) => {
            const linha = document.createElement("tr");
            linha.innerHTML = `
                <td>${formatarDataLocal(registro.data)}</td>
                <td>${registro.tipoPonto}</td>
                <td>${registro.hora}</td>
                <td>
                    ${registro.foto && registro.foto.length > 0
                        ? registro.foto.map((foto, i) => `
                            <img src="${foto}" style="width: 50px;">
                            <a href="${foto}" class="link-baixar" download="foto_${registro.tipoPonto}_${i + 1}.jpg">Baixar</a>
                        `).join("")
                        : "Nenhuma foto"}
                </td>
                <td>
                    <button onclick="editarCampo(${index}, 'data')">Editar Data</button>
                    <button onclick="editarCampo(${index}, 'tipoPonto')">Editar Tipo</button>
                    <button onclick="editarCampo(${index}, 'hora')">Editar Horário</button>
                    <button onclick="editarCampo(${index}, 'foto')">Editar Fotos</button>
                    <button onclick="removerRegistro(${index})">Remover</button>
                </td>
            `;
            tabela.appendChild(linha);
        });
    }
  }

  // Função para formatar horas no formato HH:MM
  function formatarHoras(horas) {
    const horasInt = Math.floor(horas);
    const minutos = Math.round((horas - horasInt) * 60);
    return `${horasInt.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
  }

  // Função para calcular horas trabalhadas
  function calcularHorasTrabalhadas(registros, cargaHoraria) {
    let totalHorasTrabalhadas = 0;
    let totalHorasExtras = 0;
    let totalHorasFaltantes = 0;

    // Agrupa registros por data
    const registrosPorData = {};
    registros.forEach(registro => {
        const data = new Date(registro.data).toISOString().split('T')[0];
        if (!registrosPorData[data]) {
            registrosPorData[data] = [];
        }
        registrosPorData[data].push(registro);
    });

    // Calcula horas por dia
    Object.values(registrosPorData).forEach(registrosDia => {
        // Ordena registros por hora
        registrosDia.sort((a, b) => a.hora.localeCompare(b.hora));
        
        let horasDia = 0;
        let ultimoRegistro = null;
        
        registrosDia.forEach(registro => {
            if (ultimoRegistro) {
                // Ignora período de almoço
                if (ultimoRegistro.tipoPonto === "almoco" && registro.tipoPonto === "retorno") {
                    ultimoRegistro = registro;
                    return;
                }
                
                // Calcula diferença entre registros
                const hora1 = new Date(`2000-01-01T${ultimoRegistro.hora}`);
                const hora2 = new Date(`2000-01-01T${registro.hora}`);
                const diff = (hora2 - hora1) / (1000 * 60 * 60);
                horasDia += diff;
            }
            ultimoRegistro = registro;
        });

        // Compara com carga horária
        if (horasDia > cargaHoraria) {
            totalHorasExtras += horasDia - cargaHoraria;
        } else {
            totalHorasFaltantes += cargaHoraria - horasDia;
        }
        totalHorasTrabalhadas += horasDia;
    });

    return {
        horasTrabalhadas: formatarHoras(totalHorasTrabalhadas),
        horasExtras: formatarHoras(totalHorasExtras),
        horasFaltantes: formatarHoras(totalHorasFaltantes)
    };
  }

  // Função para atualizar cálculos em tempo real
  function atualizarCalculos() {
    const cargaHoraria = document.getElementById('carga-horaria').value;
    if (cargaHoraria) {
        const [horas, minutos] = cargaHoraria.split(':').map(Number);
        const cargaHorariaDecimal = horas + minutos / 60;
        
        const resultado = calcularHorasTrabalhadas(registros, cargaHorariaDecimal);
        
        document.getElementById('horas-trabalhadas').textContent = resultado.horasTrabalhadas;
        document.getElementById('horas-extras').textContent = resultado.horasExtras;
        document.getElementById('horas-faltantes').textContent = resultado.horasFaltantes;
    }
  }

  // Adiciona event listener para o botão de calcular horas
  document.getElementById('calcular-horas').addEventListener('click', () => {
    const cargaHoraria = document.getElementById('carga-horaria').value;
    if (!cargaHoraria) {
        alert('Por favor, insira a carga horária diária');
        return;
    }

    const [horas, minutos] = cargaHoraria.split(':').map(Number);
    const cargaHorariaDecimal = horas + minutos / 60;
    
    const resultado = calcularHorasTrabalhadas(registros, cargaHorariaDecimal);
    
    document.getElementById('horas-trabalhadas').textContent = resultado.horasTrabalhadas;
    document.getElementById('horas-extras').textContent = resultado.horasExtras;
    document.getElementById('horas-faltantes').textContent = resultado.horasFaltantes;
  });

  // Adiciona event listener para atualização em tempo real da carga horária
  document.getElementById('carga-horaria').addEventListener('input', atualizarCalculos);

  // Função para ordenar registros por data e hora (mais recentes primeiro)
  function ordenarRegistros(registros) {
    return registros.sort((a, b) => {
        // Combina data e hora para comparação
        const dataHoraA = new Date(`${a.data}T${a.hora}`);
        const dataHoraB = new Date(`${b.data}T${b.hora}`);
        
        // Ordena do mais recente para o mais antigo
        return dataHoraB - dataHoraA;
    });
  }

  // Função para agrupar registros por data
  function agruparPorData(registros) {
    const registrosAgrupados = {};
    
    registros.forEach(registro => {
        const data = new Date(registro.data).toISOString().split('T')[0];
        if (!registrosAgrupados[data]) {
            registrosAgrupados[data] = [];
        }
        registrosAgrupados[data].push(registro);
    });
    
    // Ordena as datas em ordem decrescente
    return Object.keys(registrosAgrupados)
        .sort((a, b) => new Date(b) - new Date(a))
        .reduce((acc, data) => {
            acc[data] = registrosAgrupados[data];
            return acc;
        }, {});
  }

  // Mover a função gerarPDF para o escopo global
  window.gerarPDF = async function() {
    try {
        // Validar usuário logado
        const token = localStorage.getItem("token");
        const usuarioStr = localStorage.getItem("usuario");
        
        if (!token || !usuarioStr) {
            alert("Nenhum usuário logado! Faça login primeiro.");
            window.location.href = "/pages/login.html";
            return;
        }

        let usuario;
        try {
            usuario = JSON.parse(usuarioStr);
            if (!usuario || !usuario.id || !usuario.nome) {
                throw new Error("Dados do usuário inválidos");
            }
        } catch (error) {
            console.error("Erro ao processar dados do usuário:", error);
            alert("Erro nos dados do usuário. Por favor, faça login novamente.");
            window.location.href = "/pages/login.html";
            return;
        }

        // Validar carga horária
        const cargaHoraria = document.getElementById('carga-horaria').value;
        if (!cargaHoraria) {
            alert('Por favor, insira a carga horária diária antes de gerar o PDF');
            return;
        }

        // Validar formato da carga horária (HH:MM)
        const cargaHorariaRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!cargaHorariaRegex.test(cargaHoraria)) {
            alert('Por favor, insira a carga horária no formato HH:MM (ex: 08:00)');
            return;
        }

        // Validar se existem registros
        if (!registros || registros.length === 0) {
            alert('Não existem registros de ponto para gerar o relatório');
            return;
        }

        // Mostrar indicador de carregamento
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-indicator';
        loadingDiv.innerHTML = '<div class="spinner"></div><p>Gerando relatório...</p>';
        document.body.appendChild(loadingDiv);

        // Validar período (máximo 1 ano)
        const dataInicial = new Date(Math.min(...registros.map(r => new Date(r.data))));
        const dataFinal = new Date(Math.max(...registros.map(r => new Date(r.data))));
        const diffAnos = (dataFinal - dataInicial) / (1000 * 60 * 60 * 24 * 365);
        
        if (diffAnos > 1) {
            throw new Error('O período selecionado não pode exceder 1 ano');
        }

        // Criar documento PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Configurar metadados
        doc.setProperties({
            title: 'Relatório de Registro de Ponto',
            author: 'Sistema de Ponto',
            creationDate: new Date()
        });

        // Definir margens manualmente (em mm)
        const margemEsquerda = 15;
        const margemSuperior = 20;
        const margemDireita = 15;
        const margemInferior = 20;
        const larguraUtil = 210 - margemEsquerda - margemDireita;
        const alturaUtil = 297 - margemSuperior - margemInferior;

        // Adicionar cabeçalho
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('REGISTRO DE PONTO', 105, margemSuperior, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(`Período: ${formatarData(dataInicial)} a ${formatarData(dataFinal)}`, 105, margemSuperior + 10, { align: 'center' });

        // Informações do funcionário
        doc.setFontSize(10);
        doc.text('Informações do Funcionário:', margemEsquerda, margemSuperior + 20);
        doc.text(`Nome: ${usuario.nome}`, margemEsquerda, margemSuperior + 25);
        doc.text(`Email: ${usuario.email}`, margemEsquerda, margemSuperior + 30);
        doc.text(`Carga Horária: ${document.getElementById('carga-horaria').value}`, margemEsquerda, margemSuperior + 35);

        // Resumo
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Resumo do Período', 105, margemSuperior + 50, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const horasTrabalhadas = document.getElementById('horas-trabalhadas').textContent;
        const horasExtras = document.getElementById('horas-extras').textContent;
        const horasFaltantes = document.getElementById('horas-faltantes').textContent;

        doc.text(`Total de Horas Trabalhadas: ${horasTrabalhadas}`, margemEsquerda, margemSuperior + 60);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 255);
        doc.text(`Horas Extras: ${horasExtras}`, margemEsquerda, margemSuperior + 65);
        doc.setTextColor(255, 0, 0);
        doc.text(`Horas Faltantes: ${horasFaltantes}`, margemEsquerda, margemSuperior + 70);
        doc.setTextColor(0, 0, 0);

        // Tabela de registros
        let yPos = margemSuperior + 80;
        const registrosOrdenados = ordenarRegistros(registros);
        const registrosAgrupados = agruparPorData(registrosOrdenados);

        // Cabeçalho da tabela
        doc.setFillColor(245, 245, 245);
        doc.rect(margemEsquerda, yPos, larguraUtil, 8, 'F');
        doc.setFont(undefined, 'bold');
        doc.text('Data', margemEsquerda + 5, yPos + 5);
        doc.text('Tipo', margemEsquerda + 50, yPos + 5);
        doc.text('Horário', margemEsquerda + 80, yPos + 5);
        doc.text('Foto', margemEsquerda + 110, yPos + 5);

        yPos += 10;

        // Dados da tabela
        doc.setFont(undefined, 'normal');
        for (const [data, registrosDia] of Object.entries(registrosAgrupados)) {
            // Verificar se precisa de nova página
            if (yPos > 150) {
                doc.addPage();
                yPos = margemSuperior;
                
                // Adicionar cabeçalho na nova página
                doc.setFillColor(245, 245, 245);
                doc.rect(margemEsquerda, yPos, larguraUtil, 8, 'F');
                doc.setFont(undefined, 'bold');
                doc.text('Data', margemEsquerda + 5, yPos + 5);
                doc.text('Tipo', margemEsquerda + 50, yPos + 5);
                doc.text('Horário', margemEsquerda + 80, yPos + 5);
                doc.text('Foto', margemEsquerda + 110, yPos + 5);
                yPos += 10;
            }

            // Data
            doc.setFont(undefined, 'bold');
            doc.text(formatarData(new Date(data)), margemEsquerda + 5, yPos + 5);
            yPos += 8;
            
            // Registros do dia
            for (const registro of registrosDia) {
                // Tipo
                doc.setFont(undefined, 'normal');
                doc.text(registro.tipoPonto, margemEsquerda + 50, yPos + 5);
                
                // Horário
                doc.text(registro.hora, margemEsquerda + 80, yPos + 5);
                
                // Foto
                if (registro.foto && registro.foto.length > 0) {
                    try {
                        const img = new Image();
                        img.src = registro.foto[0];
                        await new Promise((resolve) => {
                            img.onload = resolve;
                        });
                        
                        // Verificar se a imagem atual cabe na página
                        const alturaNecessaria = 120;
                        if (yPos + alturaNecessaria > 250) {
                            doc.addPage();
                            yPos = margemSuperior;
                            
                            // Adicionar cabeçalho na nova página
                            doc.setFillColor(245, 245, 245);
                            doc.rect(margemEsquerda, yPos, larguraUtil, 8, 'F');
                            doc.setFont(undefined, 'bold');
                            doc.text('Data', margemEsquerda + 5, yPos + 5);
                            doc.text('Tipo', margemEsquerda + 50, yPos + 5);
                            doc.text('Horário', margemEsquerda + 80, yPos + 5);
                            doc.text('Foto', margemEsquerda + 110, yPos + 5);
                            yPos += 10;
                            
                            // Adicionar informações do registro na nova página
                            doc.setFont(undefined, 'bold');
                            doc.text(formatarData(new Date(data)), margemEsquerda + 5, yPos + 5);
                            doc.setFont(undefined, 'normal');
                            doc.text(registro.tipoPonto, margemEsquerda + 50, yPos + 5);
                            doc.text(registro.hora, margemEsquerda + 80, yPos + 5);
                            yPos += 8;
                        }
                        
                        // Redimensionar e adicionar foto
                        const maxWidth = 120;
                        const maxHeight = 90;
                        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
                        const width = img.width * ratio;
                        const height = img.height * ratio;
                        
                        // Centralizar a foto horizontalmente
                        const xPos = margemEsquerda + 110 + (maxWidth - width) / 2;
                        doc.addImage(img, 'JPEG', xPos, yPos - 5, width, height);
                        
                        // Ajustar posição Y após adicionar a foto
                        yPos += height + 10;
                    } catch (error) {
                        console.error('Erro ao processar foto:', error);
                        doc.text('N/A', margemEsquerda + 110, yPos + 5);
                        yPos += 10;
                    }
                } else {
                    doc.text('N/A', margemEsquerda + 110, yPos + 5);
                    yPos += 10;
                }
            }
            
            // Adicionar linha separadora
            doc.setDrawColor(200, 200, 200);
            doc.line(margemEsquerda, yPos, 210 - margemDireita, yPos);
            yPos += 5;
        }

        // Adicionar página de resumo com todos os registros sem fotos
        doc.addPage();
        yPos = margemSuperior;

        // Título da página de resumo
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('RESUMO DE REGISTROS', 105, yPos, { align: 'center' });
        yPos += 15;

        // Cabeçalho da tabela de resumo
        doc.setFillColor(245, 245, 245);
        doc.rect(margemEsquerda, yPos, larguraUtil, 8, 'F');
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Data', margemEsquerda + 5, yPos + 5);
        doc.text('Tipo', margemEsquerda + 50, yPos + 5);
        doc.text('Horário', margemEsquerda + 80, yPos + 5);
        yPos += 10;

        // Dados da tabela de resumo
        doc.setFont(undefined, 'normal');
        for (const [data, registrosDia] of Object.entries(registrosAgrupados)) {
            // Verificar se precisa de nova página
            if (yPos > 250) {
                doc.addPage();
                yPos = margemSuperior;
                
                // Adicionar cabeçalho na nova página
                doc.setFillColor(245, 245, 245);
                doc.rect(margemEsquerda, yPos, larguraUtil, 8, 'F');
                doc.setFont(undefined, 'bold');
                doc.text('Data', margemEsquerda + 5, yPos + 5);
                doc.text('Tipo', margemEsquerda + 50, yPos + 5);
                doc.text('Horário', margemEsquerda + 80, yPos + 5);
                yPos += 10;
            }

            // Data
            doc.setFont(undefined, 'bold');
            doc.text(formatarData(new Date(data)), margemEsquerda + 5, yPos + 5);
            yPos += 8;
            
            // Registros do dia
            for (const registro of registrosDia) {
                doc.setFont(undefined, 'normal');
                doc.text(registro.tipoPonto, margemEsquerda + 50, yPos + 5);
                doc.text(registro.hora, margemEsquerda + 80, yPos + 5);
                yPos += 8;
            }
            
            // Adicionar linha separadora
            doc.setDrawColor(200, 200, 200);
            doc.line(margemEsquerda, yPos, 210 - margemDireita, yPos);
            yPos += 5;
        }

        // Adicionar resumo de horas no final
        yPos += 10;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Resumo de Horas:', margemEsquerda, yPos);
        yPos += 10;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Total de Horas Trabalhadas: ${horasTrabalhadas}`, margemEsquerda, yPos);
        yPos += 8;
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 255);
        doc.text(`Horas Extras: ${horasExtras}`, margemEsquerda, yPos);
        yPos += 8;
        doc.setTextColor(255, 0, 0);
        doc.text(`Horas Faltantes: ${horasFaltantes}`, margemEsquerda, yPos);
        doc.setTextColor(0, 0, 0);

        // Adicionar espaço para assinatura
        yPos = 297 - margemInferior - 40;
        doc.line(margemEsquerda, yPos, margemEsquerda + 100, yPos);
        doc.setFontSize(8);
        doc.text('Assinatura do Funcionário', margemEsquerda + 50, yPos + 5, { align: 'center' });
        
        // Data da assinatura
        const dataAtual = new Date();
        dataAtual.setHours(dataAtual.getHours() + 3);
        doc.text(`Data: ${dataAtual.toLocaleDateString('pt-BR')}`, margemEsquerda + 50, yPos + 15, { align: 'center' });

        // Rodapé
        const ultimaPagina = doc.internal.getNumberOfPages();
        for (let i = 1; i <= ultimaPagina; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.text(`Página ${i} de ${ultimaPagina}`, 105, 297 - margemInferior + 5, { align: 'center' });
            doc.text('Documento para uso interno - Sistema de Ponto', 105, 297 - margemInferior + 10, { align: 'center' });
            
            // Marca d'água (email do usuário)
            doc.setTextColor(200, 200, 200);
            doc.setFontSize(12);
            doc.text(usuario.email, 210 - margemDireita - 5, margemSuperior + 5, { align: 'right' });
        }

        // Salvar PDF
        const nomeArquivo = `Ponto_${usuario.nome.replace(/\s+/g, '_')}_${formatarData(dataInicial)}_${formatarData(dataFinal)}.pdf`;
        doc.save(nomeArquivo);

        // Remover indicador de carregamento
        document.body.removeChild(loadingDiv);

        alert('Relatório gerado com sucesso!');
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        alert(`Erro ao gerar relatório: ${error.message}`);
        if (document.getElementById('loading-indicator')) {
            document.body.removeChild(document.getElementById('loading-indicator'));
        }
    }
  };

  // Função para remover um registro (movida para o escopo global)
  window.removerRegistro = async function(index) {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Nenhum usuário logado! Faça login primeiro.");
      window.location.href = "/pages/login.html";
      return;
    }

    const id = registros[index].id; // Obtém o ID do registro a ser removido

    try {
      const response = await fetch(`http://localhost:3000/registro/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      if (response.ok) {
        alert("Registro removido com sucesso!");
        buscarRegistros(); // Atualiza a tabela de registros
      } else {
        const error = await response.json();
        alert(`Erro ao remover registro: ${error.message}`);
      }
    } catch (err) {
      console.error("Erro ao remover registro:", err);
      alert("Erro no servidor. Tente novamente mais tarde.");
    }
  };

  // Função para editar um campo específico
  window.editarCampo = function (index, campo) {
    registroEditando = registros[index].id;
    campoEditando = campo;
    const registro = registros[index];

    // Exibe o formulário de edição e configura o campo correto
    formEdicao.style.display = "block";
    document.getElementById("editar-data-group").style.display =
      campo === "data" ? "block" : "none";
    document.getElementById("editar-tipo-ponto-group").style.display =
      campo === "tipoPonto" ? "block" : "none";
    document.getElementById("editar-hora-group").style.display =
      campo === "hora" ? "block" : "none";
    document.getElementById("editar-foto-group").style.display =
      campo === "foto" ? "block" : "none";

    // Preenche o formulário com os dados atuais
    if (campo === "data") {
      document.getElementById("editar-data").value = ajustarData(registro.data);
    } else if (campo === "tipoPonto") {
      document.getElementById("editar-tipo-ponto").value = registro.tipoPonto;
    } else if (campo === "hora") {
      document.getElementById("editar-hora").value = registro.hora;
    } else if (campo === "foto") {
      // Limpa o input de arquivo
      document.getElementById("editar-foto").value = "";
    }
  };

  // Função para formatar a data no formato local
  function formatarDataLocal(data) {
    const dataObj = new Date(data);
    // Ajusta o fuso horário para o Brasil
    dataObj.setHours(dataObj.getHours() + 3); // Ajusta para GMT-3 (Brasil)
    return dataObj.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Sao_Paulo"
    });
  }

  // Função para ajustar a data no formato ISO
  function ajustarData(data) {
    const dataObj = new Date(data);
    // Ajusta o fuso horário para o Brasil
    dataObj.setHours(dataObj.getHours() + 3); // Ajusta para GMT-3 (Brasil)
    return dataObj.toISOString().split("T")[0];
  }

  // Função para formatar a data no formato brasileiro
  function formatarData(data) {
    const dataObj = new Date(data);
    // Ajusta o fuso horário para o Brasil
    dataObj.setHours(dataObj.getHours() + 3); // Ajusta para GMT-3 (Brasil)
    return dataObj.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
  }

  // Função para converter arquivo em base64
  function converterParaBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }

  // Função para salvar as alterações do campo editado
  editarForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const dadosAtualizados = {};
    if (campoEditando === "data") {
      dadosAtualizados.data = document.getElementById("editar-data").value;
    } else if (campoEditando === "tipoPonto") {
      dadosAtualizados.tipoPonto = document.getElementById("editar-tipo-ponto").value;
    } else if (campoEditando === "hora") {
      dadosAtualizados.hora = document.getElementById("editar-hora").value;
    } else if (campoEditando === "foto") {
      const inputFoto = document.getElementById("editar-foto");
      if (inputFoto.files.length > 0) {
        try {
          // Converte todas as fotos para base64
          const fotosBase64 = await Promise.all(
            Array.from(inputFoto.files).map(converterParaBase64)
          );
          dadosAtualizados.foto = fotosBase64;
        } catch (err) {
          console.error("Erro ao converter fotos:", err);
          alert("Erro ao processar as fotos. Tente novamente.");
          return;
        }
      } else {
        alert("Selecione pelo menos uma foto!");
        return;
      }
    }

    try {
      const response = await fetch(`http://localhost:3000/registro/${registroEditando}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dadosAtualizados),
      });

      if (response.ok) {
        alert("Registro atualizado com sucesso!");
        formEdicao.style.display = "none";
        buscarRegistros();
      } else {
        const error = await response.json();
        alert(`Erro ao atualizar registro: ${error.message}`);
      }
    } catch (err) {
      console.error("Erro ao atualizar registro:", err);
      alert("Erro no servidor. Tente novamente mais tarde.");
    }
  });

  // Função para cancelar a edição
  cancelarEdicaoBtn.addEventListener("click", function () {
    formEdicao.style.display = "none";
    registroEditando = null;
    campoEditando = null;
  });

  // Função para fechar o modal
  function fecharModal() {
    const modal = document.getElementById('form-edicao');
    if (modal) {
        modal.style.display = 'none';
        // Limpar o formulário
        const form = document.getElementById('editar-form');
        if (form) {
            form.reset();
        }
    }
  }

  // Fechar modal ao clicar fora dele
  window.onclick = function(event) {
    const modal = document.getElementById('form-edicao');
    if (event.target === modal) {
        fecharModal();
    }
  }

  // Fechar modal ao clicar no botão cancelar
  document.getElementById('cancelar-edicao').addEventListener('click', fecharModal);

  // Garantir que o modal esteja fechado ao carregar a página
  document.addEventListener('DOMContentLoaded', function() {
    fecharModal();
  });

  // Buscar registros ao carregar a página
  buscarRegistros();
});
