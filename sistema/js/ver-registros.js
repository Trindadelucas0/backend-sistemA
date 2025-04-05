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
  let registrosFiltrados = [];
  let registroEditando = null;
  let campoEditando = null;

  // Função para buscar registros do backend
  async function buscarRegistros() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token não encontrado");
      }

      console.log("Iniciando busca de registros...");
      console.log("Token:", token.substring(0, 20) + "...");

      const response = await fetch(`${apiUrl}/registros`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Status da resposta:", response.status);
      console.log(
        "Headers da resposta:",
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Erro ao buscar registros: ${response.status}`
        );
      }

      const data = await response.json();
      console.log("Dados recebidos:", data);

      // Verifica se os dados estão dentro de um objeto com a propriedade registros
      if (data && data.registros) {
        registros = data.registros;
      } else if (Array.isArray(data)) {
        registros = data;
      } else {
        throw new Error(
          "Formato de dados inválido: resposta não contém registros"
        );
      }

      // Ordena os registros por data (mais recente primeiro)
      registros.sort((a, b) => new Date(b.data) - new Date(a.data));

      // Pega a data mais recente
      const dataMaisRecente = registros[0]
        ? new Date(registros[0].data).toISOString().split("T")[0]
        : null;

      // Define as datas inicial e final como a data mais recente
      document.getElementById("data-inicial").value = dataMaisRecente;
      document.getElementById("data-final").value = dataMaisRecente;

      // Filtra apenas os registros do dia mais recente
      registrosFiltrados = filtrarRegistrosPorData(
        dataMaisRecente,
        dataMaisRecente
      );

      atualizarTabelaRegistros();
      atualizarCalculos();
    } catch (error) {
      console.error("Erro detalhado:", error);

      // Verifica se é um erro de conexão
      if (error.message === "Failed to fetch") {
        alert(
          "Não foi possível conectar ao servidor. Verifique se o backend está rodando na porta 3000."
        );
      } else {
        alert(`Erro ao buscar registros: ${error.message}`);
      }

      // Se o erro for de autenticação, redireciona para o login
      if (
        error.message.includes("Token") ||
        error.message.includes("não autorizado")
      ) {
        window.location.href = "/sistema/pages/login.html";
      }
    }
  }

  // Função para exibir os registros na tabela
  function exibirRegistros() {
    const tbody = tabela.querySelector("tbody");
    tbody.innerHTML = ""; // Limpa a tabela atual

    if (registros.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5">Nenhum registro encontrado.</td></tr>';
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
                ${
                  registro.foto && registro.foto.length > 0
                    ? registro.foto
                        .map(
                          (foto, i) => `
                        <img src="${foto}" style="width: 50px;">
                        <a href="${foto}" class="link-baixar" download="foto_${
                            registro.tipoPonto
                          }_${i + 1}.jpg">Baixar</a>
                    `
                        )
                        .join("")
                    : "Nenhuma foto"
                }
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
    return `${horasInt
      .toString()
      .padStart(2, "0")}:${minutos.toString().padStart(2, "0")}`;
  }

  // Função para validar sequência de registros
  function validarSequenciaRegistros(registrosDia, novoRegistro) {
    if (!registrosDia || registrosDia.length === 0) {
      // Primeiro registro do dia
      if (novoRegistro.tipoPonto !== "entrada") {
        throw new Error("O primeiro registro do dia deve ser uma entrada");
      }
      return true;
    }

    const ultimoRegistro = registrosDia[registrosDia.length - 1];
    const cicloAberto = verificarCicloAberto(registrosDia);

    // Se tentar registrar uma nova entrada com ciclo aberto
    if (novoRegistro.tipoPonto === "entrada" && cicloAberto) {
      throw new Error("Ciclo anterior não fechado. Adicione a saída primeiro.");
    }

    // Validar sequência permitida
    switch (ultimoRegistro.tipoPonto) {
      case "entrada":
        if (novoRegistro.tipoPonto !== "almoco") {
          throw new Error("Após entrada, apenas almoço é permitido");
        }
        break;
      case "almoco":
        if (novoRegistro.tipoPonto !== "retorno") {
          throw new Error("Após almoço, apenas retorno é permitido");
        }
        break;
      case "retorno":
        if (novoRegistro.tipoPonto !== "saida") {
          throw new Error("Após retorno, apenas saída é permitido");
        }
        break;
      case "saida":
        if (novoRegistro.tipoPonto !== "entrada") {
          throw new Error("Após saída, apenas entrada é permitida");
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
    return ultimoRegistro.tipoPonto !== "saida";
  }

  // Função para calcular horas trabalhadas
  function calcularHorasTrabalhadas(registros) {
    let totalHorasTrabalhadas = 0;
    let totalHorasExtras = 0;
    let totalHorasFaltantes = 0;

    // Agrupa registros por data
    const registrosPorData = {};
    registros.forEach((registro) => {
      const data = new Date(registro.data).toISOString().split("T")[0];
      if (!registrosPorData[data]) {
        registrosPorData[data] = [];
      }
      registrosPorData[data].push(registro);
    });

    // Calcula horas por dia
    Object.values(registrosPorData).forEach((registrosDia) => {
      // Ordena registros por hora
      registrosDia.sort((a, b) => a.hora.localeCompare(b.hora));

      let minutosDia = 0;

      // Calcula período da manhã (entrada até almoço)
      const entrada = registrosDia.find((r) => r.tipoPonto === "entrada");
      const almoco = registrosDia.find((r) => r.tipoPonto === "almoco");
      if (entrada && almoco) {
        const [horaEntrada, minutoEntrada] = entrada.hora
          .split(":")
          .map(Number);
        const [horaAlmoco, minutoAlmoco] = almoco.hora.split(":").map(Number);
        const minutosManha =
          horaAlmoco * 60 + minutoAlmoco - (horaEntrada * 60 + minutoEntrada);
        minutosDia += minutosManha;
      }

      // Calcula período da tarde (retorno até saída)
      const retorno = registrosDia.find((r) => r.tipoPonto === "retorno");
      const saida = registrosDia.find((r) => r.tipoPonto === "saida");
      if (retorno && saida) {
        const [horaRetorno, minutoRetorno] = retorno.hora
          .split(":")
          .map(Number);
        const [horaSaida, minutoSaida] = saida.hora.split(":").map(Number);
        const minutosTarde =
          horaSaida * 60 + minutoSaida - (horaRetorno * 60 + minutoRetorno);
        minutosDia += minutosTarde;
      }

      // Converte minutos para horas
      const horasDia = minutosDia / 60;
      totalHorasTrabalhadas += horasDia;

      // Calcula horas extras/faltantes do dia
      const horasEsperadasDia = 9; // 9 horas por dia
      if (horasDia > horasEsperadasDia) {
        totalHorasExtras += horasDia - horasEsperadasDia;
      } else {
        totalHorasFaltantes += horasEsperadasDia - horasDia;
      }
    });

    return {
      horasTrabalhadas: formatarHoras(totalHorasTrabalhadas),
      horasExtras: formatarHoras(totalHorasExtras),
      horasFaltantes: formatarHoras(totalHorasFaltantes),
    };
  }

  // Função para atualizar cálculos em tempo real
  function atualizarCalculos() {
    // Usa os registros filtrados para o cálculo
    const resultado = calcularHorasTrabalhadas(registrosFiltrados);

    document.getElementById("horas-trabalhadas").textContent =
      resultado.horasTrabalhadas;
    document.getElementById("horas-extras").textContent = resultado.horasExtras;
    document.getElementById("horas-faltantes").textContent =
      resultado.horasFaltantes;
  }

  // Adiciona event listeners para os filtros de data
  document
    .getElementById("data-inicial")
    .addEventListener("change", function () {
      const dataInicial = this.value;
      const dataFinal = document.getElementById("data-final").value;
      registrosFiltrados = filtrarRegistrosPorData(dataInicial, dataFinal);
      atualizarTabelaRegistros();
      atualizarCalculos();
    });

  document.getElementById("data-final").addEventListener("change", function () {
    const dataInicial = document.getElementById("data-inicial").value;
    const dataFinal = this.value;
    registrosFiltrados = filtrarRegistrosPorData(dataInicial, dataFinal);
    atualizarTabelaRegistros();
    atualizarCalculos();
  });

  // Adiciona event listener para o botão de calcular horas
  document.getElementById("calcular-horas").addEventListener("click", () => {
    atualizarCalculos();
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

    registros.forEach((registro) => {
      const data = new Date(registro.data).toISOString().split("T")[0];
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
  window.gerarPDF = async function () {
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

      // Validar se existem registros filtrados
      if (!registrosFiltrados || registrosFiltrados.length === 0) {
        alert("Não existem registros de ponto para o período selecionado");
        return;
      }

      // Mostrar indicador de carregamento
      const loadingDiv = document.createElement("div");
      loadingDiv.id = "loading-indicator";
      loadingDiv.innerHTML =
        '<div class="spinner"></div><p>Gerando relatório...</p>';
      document.body.appendChild(loadingDiv);

      // Obter datas inicial e final do filtro
      const dataInicial = document.getElementById("data-inicial").value;
      const dataFinal = document.getElementById("data-final").value;

      // Calcular horas antes de gerar o PDF
      const resultado = calcularHorasTrabalhadas(registrosFiltrados);

      // Agrupar registros por data
      const registrosOrdenados = ordenarRegistros(registrosFiltrados);
      const registrosAgrupados = agruparPorData(registrosOrdenados);

      // Criar documento PDF
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Configurar metadados
      doc.setProperties({
        title: "Relatório de Registro de Ponto",
        author: "Sistema de Ponto",
        creationDate: new Date(),
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
      doc.setFont(undefined, "bold");
      doc.text("REGISTRO DE PONTO", 105, margemSuperior, { align: "center" });

      // Espaçamento após o título
      let yPos = margemSuperior + 15;

      doc.setFontSize(12);
      doc.setFont(undefined, "normal");
      doc.text(
        `Período: ${formatarData(new Date(dataInicial))} a ${formatarData(
          new Date(dataFinal)
        )}`,
        105,
        yPos,
        { align: "center" }
      );

      // Informações do funcionário com espaçamento adequado
      yPos += 20;
      doc.setFontSize(10);
      doc.text("Informações do Funcionário:", margemEsquerda, yPos);
      yPos += 8;
      doc.text(`Nome: ${usuario.nome}`, margemEsquerda, yPos);
      yPos += 8;
      doc.text(`Email: ${usuario.email}`, margemEsquerda, yPos);
      yPos += 8;
      doc.text(`Carga Horária Semanal: 44 horas`, margemEsquerda, yPos);

      // Resumo com espaçamento adequado
      yPos += 20;
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text("Resumo do Período", 105, yPos, { align: "center" });

      yPos += 15;
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(
        `Total de Horas Trabalhadas: ${resultado.horasTrabalhadas}`,
        margemEsquerda,
        yPos
      );
      yPos += 8;
      doc.setFont(undefined, "bold");
      doc.setTextColor(0, 0, 255);
      doc.text(`Horas Extras: ${resultado.horasExtras}`, margemEsquerda, yPos);
      yPos += 8;
      doc.setTextColor(255, 0, 0);
      doc.text(
        `Horas Faltantes: ${resultado.horasFaltantes}`,
        margemEsquerda,
        yPos
      );
      doc.setTextColor(0, 0, 0);

      // Tabela de registros com espaçamento adequado
      yPos += 20;

      // Cabeçalho da tabela
      doc.setFillColor(245, 245, 245);
      doc.rect(margemEsquerda, yPos, larguraUtil, 10, "F");
      doc.setFont(undefined, "bold");
      doc.setTextColor(0, 0, 0);
      yPos += 7;
      doc.text("Data", margemEsquerda + 5, yPos);
      doc.text("Tipo", margemEsquerda + 50, yPos);
      doc.text("Horário", margemEsquerda + 100, yPos);

      // Dados da tabela com fotos
      doc.setFont(undefined, "normal");
      for (const [data, registrosDia] of Object.entries(registrosAgrupados)) {
        // Verificar se precisa de nova página
        if (yPos > 250) {
          doc.addPage();
          yPos = margemSuperior;

          // Adicionar cabeçalho na nova página
          doc.setFillColor(245, 245, 245);
          doc.rect(margemEsquerda, yPos, larguraUtil, 10, "F");
          doc.setFont(undefined, "bold");
          yPos += 7;
          doc.text("Data", margemEsquerda + 5, yPos);
          doc.text("Tipo", margemEsquerda + 50, yPos);
          doc.text("Horário", margemEsquerda + 100, yPos);
          yPos += 10;
        }

        // Data
        yPos += 10;
        doc.setFont(undefined, "bold");
        doc.text(formatarData(new Date(data)), margemEsquerda + 5, yPos);

        // Registros do dia
        for (const registro of registrosDia) {
          yPos += 8;
          doc.setFont(undefined, "normal");
          doc.text(registro.tipoPonto, margemEsquerda + 50, yPos);
          doc.text(registro.hora, margemEsquerda + 100, yPos);

          // Adicionar foto se existir
          if (registro.foto && registro.foto.length > 0) {
            try {
              const img = new Image();
              img.src = registro.foto[0];
              await new Promise((resolve) => {
                img.onload = resolve;
              });

              // Verificar se precisa de nova página para a foto
              if (yPos > 200) {
                doc.addPage();
                yPos = margemSuperior;
              }

              // Adicionar foto em tamanho maior
              const maxWidth = 160; // Largura máxima da foto
              const maxHeight = 120; // Altura máxima da foto
              const ratio = Math.min(
                maxWidth / img.width,
                maxHeight / img.height
              );
              const width = img.width * ratio;
              const height = img.height * ratio;

              // Centralizar a foto
              const xPos = margemEsquerda + (larguraUtil - width) / 2;
              doc.addImage(img, "JPEG", xPos, yPos + 5, width, height);
              yPos += height + 15; // Espaço após a foto
            } catch (error) {
              console.error("Erro ao processar foto:", error);
              yPos += 5;
            }
          }
        }

        // Linha separadora
        yPos += 5;
        doc.setDrawColor(200, 200, 200);
        doc.line(margemEsquerda, yPos, 210 - margemDireita, yPos);
      }

      // Adicionar página de resumo sem fotos
      doc.addPage();
      yPos = margemSuperior;

      // Título da página de resumo
      doc.setFontSize(16);
      doc.setFont(undefined, "bold");
      doc.text("RESUMO DE REGISTROS", 105, yPos, { align: "center" });
      yPos += 20;

      // Cabeçalho da tabela de resumo
      doc.setFillColor(245, 245, 245);
      doc.rect(margemEsquerda, yPos, larguraUtil, 10, "F");
      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      yPos += 7;
      doc.text("Data", margemEsquerda + 5, yPos);
      doc.text("Tipo", margemEsquerda + 50, yPos);
      doc.text("Horário", margemEsquerda + 100, yPos);
      yPos += 10;

      // Dados da tabela de resumo
      doc.setFont(undefined, "normal");
      for (const [data, registrosDia] of Object.entries(registrosAgrupados)) {
        // Verificar se precisa de nova página
        if (yPos > 250) {
          doc.addPage();
          yPos = margemSuperior;

          // Adicionar cabeçalho na nova página
          doc.setFillColor(245, 245, 245);
          doc.rect(margemEsquerda, yPos, larguraUtil, 10, "F");
          doc.setFont(undefined, "bold");
          yPos += 7;
          doc.text("Data", margemEsquerda + 5, yPos);
          doc.text("Tipo", margemEsquerda + 50, yPos);
          doc.text("Horário", margemEsquerda + 100, yPos);
          yPos += 10;
        }

        // Data
        yPos += 8;
        doc.setFont(undefined, "bold");
        doc.text(formatarData(new Date(data)), margemEsquerda + 5, yPos);

        // Registros do dia
        for (const registro of registrosDia) {
          yPos += 8;
          doc.setFont(undefined, "normal");
          doc.text(registro.tipoPonto, margemEsquerda + 50, yPos);
          doc.text(registro.hora, margemEsquerda + 100, yPos);
        }

        // Linha separadora
        yPos += 5;
        doc.setDrawColor(200, 200, 200);
        doc.line(margemEsquerda, yPos, 210 - margemDireita, yPos);
      }

      // Adicionar resumo final de horas
      yPos += 20;
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text("Resumo Final de Horas:", margemEsquerda, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(
        `Total de Horas Trabalhadas: ${resultado.horasTrabalhadas}`,
        margemEsquerda,
        yPos
      );
      yPos += 8;
      doc.setFont(undefined, "bold");
      doc.setTextColor(0, 0, 255);
      doc.text(`Horas Extras: ${resultado.horasExtras}`, margemEsquerda, yPos);
      yPos += 8;
      doc.setTextColor(255, 0, 0);
      doc.text(
        `Horas Faltantes: ${resultado.horasFaltantes}`,
        margemEsquerda,
        yPos
      );
      doc.setTextColor(0, 0, 0);

      // Se a posição atual estiver muito próxima do final da página, adicionar nova página
      if (yPos > 220) {
        doc.addPage();
        yPos = margemSuperior;
      }

      // Calcular posição para assinatura (sempre na parte inferior da página)
      const alturaAssinatura = 40; // Altura total necessária para assinatura
      const espacoNecessario = alturaAssinatura + 30; // Espaço necessário + margem de segurança

      // Se não houver espaço suficiente, adicionar nova página
      if (yPos > 297 - margemInferior - espacoNecessario) {
        doc.addPage();
        yPos = margemSuperior;
      }

      // Posicionar assinatura
      yPos = 297 - margemInferior - alturaAssinatura;

      // Linha de assinatura
      doc.setDrawColor(0, 0, 0);
      doc.line(margemEsquerda, yPos, margemEsquerda + 100, yPos);

      // Texto "Assinatura do Funcionário"
      doc.setFontSize(8);
      doc.setFont(undefined, "normal");
      doc.text("Assinatura do Funcionário", margemEsquerda + 50, yPos + 5, {
        align: "center",
      });

      // Data da assinatura
      const dataAtual = new Date();
      doc.text(
        `Data: ${dataAtual.toLocaleDateString("pt-BR")}`,
        margemEsquerda + 50,
        yPos + 15,
        { align: "center" }
      );

      // Rodapé em todas as páginas
      const ultimaPagina = doc.internal.getNumberOfPages();
      for (let i = 1; i <= ultimaPagina; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Página ${i} de ${ultimaPagina}`, 105, 287, {
          align: "center",
        });
        doc.text("Documento para uso interno - Sistema de Ponto", 105, 292, {
          align: "center",
        });
      }

      // Salvar PDF
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const nomeArquivo = `Ponto_${usuario.nome.replace(
        /\s+/g,
        "_"
      )}_${formatarData(new Date(dataInicial))}_${formatarData(
        new Date(dataFinal)
      )}_${timestamp}.pdf`;
      doc.save(nomeArquivo);

      // Remover indicador de carregamento
      document.body.removeChild(loadingDiv);

      alert("Relatório gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert(`Erro ao gerar relatório: ${error.message}`);
      if (document.getElementById("loading-indicator")) {
        document.body.removeChild(document.getElementById("loading-indicator"));
      }
    }
  };

  // Função para remover um registro (movida para o escopo global)
  window.removerRegistro = async function (id) {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Nenhum usuário logado! Faça login primeiro.");
      window.location.href = "/pages/login.html";
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/registro/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
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
  window.editarCampo = function (id, campo) {
    registroEditando = id;
    campoEditando = campo;

    // Encontra o registro pelo ID
    const registro = registros.find((r) => r.id === id);
    if (!registro) {
      alert("Registro não encontrado!");
      return;
    }

    // Exibe o formulário de edição
    formEdicao.style.display = "block";

    // Esconde todos os grupos primeiro
    document.getElementById("editar-data-group").style.display = "none";
    document.getElementById("editar-tipo-ponto-group").style.display = "none";
    document.getElementById("editar-hora-group").style.display = "none";
    document.getElementById("editar-foto-group").style.display = "none";

    // Mostra apenas o grupo do campo sendo editado
    switch (campo) {
      case "data":
        document.getElementById("editar-data-group").style.display = "block";
        document.getElementById("editar-data").value = ajustarData(
          registro.data
        );
        break;
      case "tipoPonto":
        document.getElementById("editar-tipo-ponto-group").style.display =
          "block";
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
      timeZone: "America/Sao_Paulo",
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
    return dataObj.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
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
    switch (campoEditando) {
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
      const response = await fetch(`${apiUrl}/registro/${registroEditando}`, {
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
  window.onclick = function (event) {
    if (event.target === formEdicao) {
      fecharModal();
    }
  };

  // Garantir que o modal esteja fechado ao carregar a página
  document.addEventListener("DOMContentLoaded", function () {
    fecharModal();
  });

  // Buscar registros ao carregar a página
  buscarRegistros();

  // Função para atualizar status do ciclo na interface
  function atualizarStatusCiclo() {
    const hoje = new Date().toISOString().split("T")[0];
    const registrosDia = registros.filter((r) => r.data === hoje);
    const cicloAberto = verificarCicloAberto(registrosDia);

    const cicloStatus = document.getElementById("ciclo-status");
    const proximoRegistro = document.getElementById("proximo-registro");

    if (cicloAberto) {
      cicloStatus.classList.add("aberto");
      cicloStatus.querySelector("span").textContent = "Ciclo Aberto";

      // Determinar próximo registro esperado
      const ultimoRegistro = registrosDia[registrosDia.length - 1];
      let proximo = "";

      switch (ultimoRegistro.tipoPonto) {
        case "entrada":
          proximo = "Almoço";
          break;
        case "almoco":
          proximo = "Retorno";
          break;
        case "retorno":
          proximo = "Saída";
          break;
      }

      proximoRegistro.querySelector("span").textContent = proximo;
    } else {
      cicloStatus.classList.remove("aberto");
      cicloStatus.querySelector("span").textContent = "Ciclo Fechado";
      proximoRegistro.querySelector("span").textContent = "Entrada";
    }
  }

  // Função para editar data
  window.editarData = function (id) {
    editarCampo(id, "data");
  };

  // Função para filtrar registros por data
  function filtrarRegistrosPorData(dataInicial, dataFinal) {
    if (!dataInicial || !dataFinal) {
      return registros;
    }

    const dataInicialObj = new Date(dataInicial);
    const dataFinalObj = new Date(dataFinal);

    // Ajusta a data final para incluir o dia inteiro
    dataFinalObj.setHours(23, 59, 59, 999);

    return registros.filter((registro) => {
      const dataRegistro = new Date(registro.data);
      return dataRegistro >= dataInicialObj && dataRegistro <= dataFinalObj;
    });
  }

  // Função para atualizar a tabela com os registros filtrados
  function atualizarTabelaRegistros() {
    const tbody = document.querySelector("#tabela-registros tbody");
    tbody.innerHTML = "";

    if (registrosFiltrados.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5">Nenhum registro encontrado para o período selecionado.</td></tr>';
      return;
    }

    // Agrupa registros por data
    const registrosPorData = {};
    registrosFiltrados.forEach((registro) => {
      const data = new Date(registro.data).toISOString().split("T")[0];
      if (!registrosPorData[data]) {
        registrosPorData[data] = [];
      }
      registrosPorData[data].push(registro);
    });

    // Ordena as datas em ordem decrescente
    const datasOrdenadas = Object.keys(registrosPorData).sort(
      (a, b) => new Date(b) - new Date(a)
    );

    // Para cada data, ordena os registros na sequência correta
    datasOrdenadas.forEach((data) => {
      const registrosDia = registrosPorData[data];

      // Define a ordem correta dos tipos de registro
      const ordemTipos = ["entrada", "almoco", "retorno", "saida"];

      // Ordena os registros do dia na sequência correta
      registrosDia.sort((a, b) => {
        const indexA = ordemTipos.indexOf(a.tipoPonto);
        const indexB = ordemTipos.indexOf(b.tipoPonto);
        return indexA - indexB;
      });

      // Adiciona um cabeçalho para o dia da semana
      const dataObj = new Date(data);
      const diaSemana = dataObj.toLocaleDateString("pt-BR", {
        weekday: "long",
      });
      const trCabecalho = document.createElement("tr");
      trCabecalho.innerHTML = `
        <td colspan="5" style="background-color: #f0f0f0; font-weight: bold; text-align: center;">
          ${
            diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)
          } - ${formatarData(dataObj)}
        </td>
      `;
      tbody.appendChild(trCabecalho);

      // Adiciona os registros do dia na tabela
      registrosDia.forEach((registro) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${formatarDataLocal(registro.data)}</td>
          <td>${registro.tipoPonto}</td>
          <td>${registro.hora}</td>
          <td>
            ${
              registro.foto && registro.foto.length > 0
                ? registro.foto
                    .map(
                      (foto, i) => `
                <img src="${foto}" style="width: 50px;">
                <a href="${foto}" class="link-baixar" download="foto_${
                        registro.tipoPonto
                      }_${i + 1}.jpg">Baixar</a>
              `
                    )
                    .join("")
                : "Nenhuma foto"
            }
          </td>
          <td>
            <button onclick="editarCampo('${
              registro.id
            }', 'data')">Editar Data</button>
            <button onclick="editarCampo('${
              registro.id
            }', 'tipoPonto')">Editar Tipo</button>
            <button onclick="editarCampo('${
              registro.id
            }', 'hora')">Editar Hora</button>
            <button onclick="editarCampo('${
              registro.id
            }', 'foto')">Editar Fotos</button>
            <button onclick="removerRegistro('${registro.id}')">Remover</button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Adiciona uma linha separadora após cada dia
      const trSeparador = document.createElement("tr");
      trSeparador.innerHTML =
        '<td colspan="5" style="border-bottom: 2px solid #ccc;"></td>';
      tbody.appendChild(trSeparador);
    });
  }

  // Adiciona event listener para o botão de filtrar datas
  document.getElementById("filtrar-datas").addEventListener("click", () => {
    const dataInicial = document.getElementById("data-inicial").value;
    const dataFinal = document.getElementById("data-final").value;

    if (!dataInicial || !dataFinal) {
      alert("Por favor, selecione as datas inicial e final");
      return;
    }

    // Valida se a data final não é anterior à data inicial
    if (new Date(dataFinal) < new Date(dataInicial)) {
      alert("A data final não pode ser anterior à data inicial");
      return;
    }

    registrosFiltrados = filtrarRegistrosPorData(dataInicial, dataFinal);
    atualizarTabelaRegistros();
    atualizarCalculos();
  });
});
function fazerLogout() {
  // Limpa os dados de autenticação
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  
  // Redireciona para a página de login
  window.location.href = 'login.html';
}