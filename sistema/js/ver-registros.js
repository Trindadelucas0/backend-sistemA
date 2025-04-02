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
        console.log("Registros atualizados:", registros); // Log para debug
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
    const tbody = tabela.querySelector("tbody");
    tbody.innerHTML = ""; // Limpa a tabela atual

    if (registros.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">Nenhum registro encontrado.</td></tr>';
        return;
    }

    // Ordena os registros por data e hora
    const registrosOrdenados = registros.sort((a, b) => {
        const dataA = new Date(a.data);
        const dataB = new Date(b.data);
        if (dataA.getTime() === dataB.getTime()) {
            return a.hora.localeCompare(b.hora);
        }
        return dataB.getTime() - dataA.getTime();
    });

    registrosOrdenados.forEach((registro, index) => {
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
                <button onclick="editarData(${index})">Editar Data</button>
                <button onclick="editarCampo(${index}, 'tipoPonto')">Editar Tipo</button>
                <button onclick="editarCampo(${index}, 'hora')">Editar Horário</button>
                <button onclick="editarCampo(${index}, 'foto')">Editar Fotos</button>
                <button onclick="removerRegistro(${index})">Remover</button>
            </td>
        `;
        tbody.appendChild(linha);
    });
  }

  // Função para formatar horas no formato HH:MM
  function formatarHoras(horas) {
    const horasInt = Math.floor(horas);
    const minutos = Math.round((horas - horasInt) * 60);
    return `${horasInt.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
  }

  // Função para validar sequência de registros
  function validarSequenciaRegistros(registrosDia, novoRegistro) {
    if (!registrosDia || registrosDia.length === 0) {
        // Primeiro registro do dia
        if (novoRegistro.tipoPonto !== 'entrada') {
            throw new Error('O primeiro registro do dia deve ser uma entrada');
        }
        return true;
    }

    const ultimoRegistro = registrosDia[registrosDia.length - 1];
    const cicloAberto = verificarCicloAberto(registrosDia);

    // Se tentar registrar uma nova entrada com ciclo aberto
    if (novoRegistro.tipoPonto === 'entrada' && cicloAberto) {
        throw new Error('Ciclo anterior não fechado. Adicione a saída primeiro.');
    }

    // Validar sequência permitida
    switch (ultimoRegistro.tipoPonto) {
        case 'entrada':
            if (novoRegistro.tipoPonto !== 'almoco') {
                throw new Error('Após entrada, apenas almoço é permitido');
            }
            break;
        case 'almoco':
            if (novoRegistro.tipoPonto !== 'retorno') {
                throw new Error('Após almoço, apenas retorno é permitido');
            }
            break;
        case 'retorno':
            if (novoRegistro.tipoPonto !== 'saida') {
                throw new Error('Após retorno, apenas saída é permitido');
            }
            break;
        case 'saida':
            if (novoRegistro.tipoPonto !== 'entrada') {
                throw new Error('Após saída, apenas entrada é permitida');
            }
            break;
    }

    return true;
  }

  // Função para verificar se existe ciclo aberto
  function verificarCicloAberto(registrosDia) {
    if (!registrosDia || registrosDia.length === 0) {
        return false;
    }

    const ultimoRegistro = registrosDia[registrosDia.length - 1];
    return ultimoRegistro.tipoPonto !== 'saida';
  }

  // Função para calcular horas trabalhadas
  function calcularHorasTrabalhadas(registros) {
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
        let periodoAlmoco = 0;
        
        // Calcula período da manhã (entrada até almoço)
        const entrada = registrosDia.find(r => r.tipoPonto === 'entrada');
        const almoco = registrosDia.find(r => r.tipoPonto === 'almoco');
        if (entrada && almoco) {
            const horaEntrada = new Date(`2000-01-01T${entrada.hora}`);
            const horaAlmoco = new Date(`2000-01-01T${almoco.hora}`);
            periodoAlmoco += (horaAlmoco - horaEntrada) / (1000 * 60 * 60);
        }
        
        // Calcula período da tarde (retorno até saída)
        const retorno = registrosDia.find(r => r.tipoPonto === 'retorno');
        const saida = registrosDia.find(r => r.tipoPonto === 'saida');
        if (retorno && saida) {
            const horaRetorno = new Date(`2000-01-01T${retorno.hora}`);
            const horaSaida = new Date(`2000-01-01T${saida.hora}`);
            periodoAlmoco += (horaSaida - horaRetorno) / (1000 * 60 * 60);
        }
        
        horasDia = periodoAlmoco;
        totalHorasTrabalhadas += horasDia;
    });

    // Calcula horas semanais (44 horas por semana)
    const horasSemanais = 44;
    const horasDiarias = horasSemanais / 5; // 5 dias úteis por semana
    const totalDias = Object.keys(registrosPorData).length;
    const horasEsperadas = totalDias * horasDiarias;

    // Calcula diferença
    if (totalHorasTrabalhadas > horasEsperadas) {
        totalHorasExtras = totalHorasTrabalhadas - horasEsperadas;
        totalHorasFaltantes = 0;
    } else {
        totalHorasFaltantes = horasEsperadas - totalHorasTrabalhadas;
        totalHorasExtras = 0;
    }

    return {
        horasTrabalhadas: formatarHoras(totalHorasTrabalhadas),
        horasExtras: formatarHoras(totalHorasExtras),
        horasFaltantes: formatarHoras(totalHorasFaltantes)
    };
  }

  // Função para atualizar cálculos em tempo real
  function atualizarCalculos() {
    const resultado = calcularHorasTrabalhadas(registros);
    
    document.getElementById('horas-trabalhadas').textContent = resultado.horasTrabalhadas;
    document.getElementById('horas-extras').textContent = resultado.horasExtras;
    document.getElementById('horas-faltantes').textContent = resultado.horasFaltantes;
  }

  // Adiciona event listener para o botão de calcular horas
  document.getElementById('calcular-horas').addEventListener('click', () => {
    const resultado = calcularHorasTrabalhadas(registros);
    
    document.getElementById('horas-trabalhadas').textContent = resultado.horasTrabalhadas;
    document.getElementById('horas-extras').textContent = resultado.horasExtras;
    document.getElementById('horas-faltantes').textContent = resultado.horasFaltantes;
  });

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
        yPos += 8;

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

    // Exibe o formulário de edição
    formEdicao.style.display = "block";
    
    // Esconde todos os grupos primeiro
    document.getElementById("editar-data-group").style.display = "none";
    document.getElementById("editar-tipo-ponto-group").style.display = "none";
    document.getElementById("editar-hora-group").style.display = "none";
    document.getElementById("editar-foto-group").style.display = "none";
    
    // Mostra apenas o grupo do campo sendo editado
    switch(campo) {
        case "data":
            document.getElementById("editar-data-group").style.display = "block";
            document.getElementById("editar-data").value = ajustarData(registro.data);
            break;
        case "tipoPonto":
            document.getElementById("editar-tipo-ponto-group").style.display = "block";
            document.getElementById("editar-tipo-ponto").value = registro.tipoPonto;
            break;
        case "hora":
            document.getElementById("editar-hora-group").style.display = "block";
            document.getElementById("editar-hora").value = registro.hora;
            break;
        case "foto":
            document.getElementById("editar-foto-group").style.display = "block";
            document.getElementById("editar-foto").value = "";
            break;
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

  // Event listener do formulário de edição
  editarForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!registroEditando || !campoEditando) {
        alert("Erro: Nenhum registro selecionado para edição");
        return;
    }

    const dadosAtualizados = {};
    let campoValido = true;
    
    // Valida apenas o campo que está sendo editado
    switch(campoEditando) {
        case "data":
            const data = document.getElementById("editar-data").value;
            if (!data) {
                alert("Por favor, selecione uma data");
                campoValido = false;
            } else {
                dadosAtualizados.data = data;
            }
            break;
        case "tipoPonto":
            const tipoPonto = document.getElementById("editar-tipo-ponto").value;
            if (!tipoPonto) {
                alert("Por favor, selecione um tipo de ponto");
                campoValido = false;
            } else {
                dadosAtualizados.tipoPonto = tipoPonto;
            }
            break;
        case "hora":
            const hora = document.getElementById("editar-hora").value;
            if (!hora) {
                alert("Por favor, selecione um horário");
                campoValido = false;
            } else {
                dadosAtualizados.hora = hora;
            }
            break;
        case "foto":
            const inputFoto = document.getElementById("editar-foto");
            if (inputFoto.files.length === 0) {
                alert("Por favor, selecione pelo menos uma foto");
                campoValido = false;
            } else {
                try {
                    const fotosBase64 = await Promise.all(
                        Array.from(inputFoto.files).map(converterParaBase64)
                    );
                    dadosAtualizados.foto = fotosBase64;
                } catch (err) {
                    console.error("Erro ao converter fotos:", err);
                    alert("Erro ao processar as fotos. Tente novamente.");
                    campoValido = false;
                }
            }
            break;
    }

    if (!campoValido) return;

    try {
        console.log("Enviando atualização:", dadosAtualizados);
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
            await buscarRegistros();
            registroEditando = null;
            campoEditando = null;
        } else {
            const error = await response.json();
            alert(`Erro ao atualizar registro: ${error.message}`);
        }
    } catch (err) {
        console.error("Erro ao atualizar registro:", err);
        alert("Erro no servidor. Tente novamente mais tarde.");
    }
  });

  // Função para limpar o formulário
  function limparFormulario() {
    document.getElementById("editar-data").value = "";
    document.getElementById("editar-tipo-ponto").value = "entrada";
    document.getElementById("editar-hora").value = "";
    document.getElementById("editar-foto").value = "";
    registroEditando = null;
    campoEditando = null;
  }

  // Função para fechar o modal
  function fecharModal() {
    formEdicao.style.display = "none";
    limparFormulario();
  }

  // Adicionar event listener para o botão cancelar
  cancelarEdicaoBtn.addEventListener("click", fecharModal);

  // Fechar modal ao clicar fora dele
  window.onclick = function(event) {
    if (event.target === formEdicao) {
        fecharModal();
    }
  }

  // Garantir que o modal esteja fechado ao carregar a página
  document.addEventListener('DOMContentLoaded', function() {
    fecharModal();
  });

  // Buscar registros ao carregar a página
  buscarRegistros();

  // Função para atualizar status do ciclo na interface
  function atualizarStatusCiclo() {
    const hoje = new Date().toISOString().split('T')[0];
    const registrosDia = registros.filter(r => r.data === hoje);
    const cicloAberto = verificarCicloAberto(registrosDia);
    
    const cicloStatus = document.getElementById('ciclo-status');
    const proximoRegistro = document.getElementById('proximo-registro');
    
    if (cicloAberto) {
        cicloStatus.classList.add('aberto');
        cicloStatus.querySelector('span').textContent = 'Ciclo Aberto';
        
        // Determinar próximo registro esperado
        const ultimoRegistro = registrosDia[registrosDia.length - 1];
        let proximo = '';
        
        switch (ultimoRegistro.tipoPonto) {
            case 'entrada':
                proximo = 'Almoço';
                break;
            case 'almoco':
                proximo = 'Retorno';
                break;
            case 'retorno':
                proximo = 'Saída';
                break;
        }
        
        proximoRegistro.querySelector('span').textContent = proximo;
    } else {
        cicloStatus.classList.remove('aberto');
        cicloStatus.querySelector('span').textContent = 'Ciclo Fechado';
        proximoRegistro.querySelector('span').textContent = 'Entrada';
    }
  }

  // Função para editar data
  window.editarData = function (index) {
    registroEditando = registros[index].id;
    campoEditando = "data"; // Define o campo sendo editado
    const registro = registros[index];

    // Exibe o formulário de edição
    formEdicao.style.display = "block";
    
    // Mostra apenas o campo de data
    document.getElementById("editar-data-group").style.display = "block";
    document.getElementById("editar-tipo-ponto-group").style.display = "none";
    document.getElementById("editar-hora-group").style.display = "none";
    document.getElementById("editar-foto-group").style.display = "none";

    // Preenche o formulário com a data atual
    document.getElementById("editar-data").value = ajustarData(registro.data);
  };
});
