document.addEventListener("DOMContentLoaded", function () {
  // Verificar token e usuário
  const token = localStorage.getItem("token");
  const usuarioStr = localStorage.getItem("usuario");

  if (!token || !usuarioStr) {
    alert("Nenhum usuário logado! Faça login primeiro.");
    window.location.href = "/sistema/pages/login.html";
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
    window.location.href = "/sistema/pages/login.html";
    return;
  }

  // Verificar se o usuário é admin
  if (!usuario.isAdmin) {
    alert("Acesso negado. Apenas administradores podem acessar esta página.");
    window.location.href = "/sistema/pages/registro-ponto.html";
    return;
  }

  // Exibir nome do admin
  document.getElementById("admin-name").textContent = `Admin: ${usuario.nome}`;

  // Elementos da interface
  const btnUsuarios = document.getElementById("btn-usuarios");
  const btnRegistros = document.getElementById("btn-registros");
  const panelUsuarios = document.getElementById("panel-usuarios");
  const panelRegistros = document.getElementById("panel-registros");
  const searchUser = document.getElementById("search-user");
  const btnSearch = document.getElementById("btn-search");
  const selectUser = document.getElementById("select-user");
  const dataInicial = document.getElementById("data-inicial");
  const dataFinal = document.getElementById("data-final");
  const btnFiltrarDatas = document.getElementById("filtrar-datas");
  const btnGerarPdf = document.getElementById("gerar-pdf");
  const btnLogout = document.getElementById("logout-btn");
  const formEdicao = document.getElementById("form-edicao");
  const editarForm = document.getElementById("editar-form");
  const cancelarEdicaoBtn = document.getElementById("cancelar-edicao");

  // Variáveis globais
  let usuarios = [];
  let registros = [];
  let registrosFiltrados = [];
  let registroEditando = null;
  let usuarioSelecionado = null;

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

  // Função para formatar data no formato brasileiro
  function formatarData(data) {
    return data.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  // Função para alternar entre painéis
  function alternarPainel(painelAtivo) {
    // Desativar todos os painéis
    document.querySelectorAll(".panel-content").forEach((panel) => {
      panel.classList.remove("active");
    });

    // Desativar todos os botões
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.remove("active");
    });

    // Ativar o painel selecionado
    painelAtivo.classList.add("active");

    // Ativar o botão correspondente
    if (painelAtivo === panelUsuarios) {
      btnUsuarios.classList.add("active");
    } else if (painelAtivo === panelRegistros) {
      btnRegistros.classList.add("active");
    }
  }

  // Event listeners para alternar painéis
  btnUsuarios.addEventListener("click", () => alternarPainel(panelUsuarios));
  btnRegistros.addEventListener("click", () => alternarPainel(panelRegistros));

  // Função para buscar usuários
  async function buscarUsuarios() {
    try {
      const response = await fetch(`${apiUrl}/usuarios`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar usuários: ${response.status}`);
      }

      const data = await response.json();
      usuarios = data.users;

      // Preencher a tabela de usuários
      preencherTabelaUsuarios();

      // Preencher o select de usuários para o painel de registros
      preencherSelectUsuarios();
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      alert(`Erro ao buscar usuários: ${error.message}`);
    }
  }

  // Função para preencher a tabela de usuários
  function preencherTabelaUsuarios() {
    const tbody = document.querySelector("#tabela-usuarios tbody");
    tbody.innerHTML = "";

    usuarios.forEach((user) => {
      const tr = document.createElement("tr");

      // Formatar a data de último acesso
      let ultimoAcesso = "Nunca";
      if (user.lastLogin) {
        const data = new Date(user.lastLogin);
        ultimoAcesso = data.toLocaleString("pt-BR");
      }

      tr.innerHTML = `
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>
          <span class="status-badge ${
            user.isBlocked ? "status-blocked" : "status-active"
          }">
            ${user.isBlocked ? "Bloqueado" : "Ativo"}
          </span>
        </td>
        <td>${ultimoAcesso}</td>
        <td>
          <button class="action-btn btn-view" data-id="${user.id}">
            <i class="fas fa-eye"></i> Ver Registros
          </button>
          ${
            user.isBlocked
              ? `<button class="action-btn btn-unblock" data-id="${user.id}">
              <i class="fas fa-unlock"></i> Desbloquear
            </button>`
              : `<button class="action-btn btn-block" data-id="${user.id}">
              <i class="fas fa-lock"></i> Bloquear
            </button>`
          }
        </td>
      `;

      tbody.appendChild(tr);
    });

    // Adicionar event listeners aos botões
    document.querySelectorAll(".btn-view").forEach((btn) => {
      btn.addEventListener("click", () => {
        const userId = btn.getAttribute("data-id");
        const user = usuarios.find((u) => u.id === userId);
        if (user) {
          usuarioSelecionado = user;
          selectUser.value = user.id;
          alternarPainel(panelRegistros);
          buscarRegistrosUsuario(user.id);
        }
      });
    });

    document.querySelectorAll(".btn-block, .btn-unblock").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const userId = btn.getAttribute("data-id");
        const isBlocked = btn.classList.contains("btn-block");
        await alterarStatusUsuario(userId, isBlocked);
      });
    });
  }

  // Função para preencher o select de usuários
  function preencherSelectUsuarios() {
    selectUser.innerHTML = '<option value="">Selecione um usuário...</option>';

    usuarios.forEach((user) => {
      const option = document.createElement("option");
      option.value = user.id;
      option.textContent = user.name;
      selectUser.appendChild(option);
    });

    // Se houver um usuário selecionado, selecionar no dropdown
    if (usuarioSelecionado) {
      selectUser.value = usuarioSelecionado.id;
    }
  }

  // Função para alterar o status de um usuário (bloquear/desbloquear)
  async function alterarStatusUsuario(userId, isBlocked) {
    try {
      const response = await fetch(`${apiUrl}/usuarios/${userId}/status`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isBlocked }),
      });

      if (!response.ok) {
        throw new Error(
          `Erro ao alterar status do usuário: ${response.status}`
        );
      }

      const data = await response.json();
      alert(data.message);

      // Atualizar a lista de usuários
      buscarUsuarios();
    } catch (error) {
      console.error("Erro ao alterar status do usuário:", error);
      alert(`Erro ao alterar status do usuário: ${error.message}`);
    }
  }

  // Função para buscar registros de um usuário específico
  async function buscarRegistrosUsuario(userId) {
    try {
      const response = await fetch(`${apiUrl}/usuarios/${userId}/registros`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar registros: ${response.status}`);
      }

      const data = await response.json();
      registros = data.registros;

      // Ordenar registros por data (mais recente primeiro)
      registros.sort((a, b) => new Date(b.data) - new Date(a.data));

      // Pega a data mais recente
      const dataMaisRecente = registros[0]
        ? new Date(registros[0].data).toISOString().split("T")[0]
        : null;

      // Define as datas inicial e final como a data mais recente
      dataInicial.value = dataMaisRecente;
      dataFinal.value = dataMaisRecente;

      // Filtra apenas os registros do dia mais recente
      registrosFiltrados = filtrarRegistrosPorData(
        dataMaisRecente,
        dataMaisRecente
      );

      atualizarTabelaRegistros();
      atualizarCalculos();
    } catch (error) {
      console.error("Erro ao buscar registros:", error);
      alert(`Erro ao buscar registros: ${error.message}`);
    }
  }

  // Função para filtrar registros por data
  function filtrarRegistrosPorData(dataInicial, dataFinal) {
    if (!dataInicial || !dataFinal) {
      return registros;
    }

    const dataInicialObj = new Date(dataInicial);
    const dataFinalObj = new Date(dataFinal);

    // Ajustar para considerar o dia inteiro
    dataInicialObj.setHours(0, 0, 0, 0);
    dataFinalObj.setHours(23, 59, 59, 999);

    return registros.filter((registro) => {
      const dataRegistro = new Date(registro.data);
      return dataRegistro >= dataInicialObj && dataRegistro <= dataFinalObj;
    });
  }

  // Função para atualizar a tabela de registros
  function atualizarTabelaRegistros() {
    const tbody = document.querySelector("#tabela-registros tbody");
    tbody.innerHTML = "";

    if (registrosFiltrados.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="5" class="no-records">Nenhum registro encontrado para o período selecionado.</td>`;
      tbody.appendChild(tr);
      return;
    }

    registrosFiltrados.forEach((registro) => {
      const tr = document.createElement("tr");

      // Formatar a data
      const data = new Date(registro.data);
      const dataFormatada = data.toLocaleDateString("pt-BR");

      // Formatar o tipo de ponto
      let tipoPontoFormatado = registro.tipoPonto;
      switch (registro.tipoPonto) {
        case "entrada":
          tipoPontoFormatado = "Entrada";
          break;
        case "saida":
          tipoPontoFormatado = "Saída";
          break;
        case "almoco":
          tipoPontoFormatado = "Almoço";
          break;
        case "retorno":
          tipoPontoFormatado = "Retorno";
          break;
        case "intervalo_inicio":
          tipoPontoFormatado = "Início Intervalo";
          break;
        case "intervalo_fim":
          tipoPontoFormatado = "Fim Intervalo";
          break;
      }

      tr.innerHTML = `
        <td>${dataFormatada}</td>
        <td>${tipoPontoFormatado}</td>
        <td>${registro.hora}</td>
        <td>${
          registro.foto && registro.foto.length > 0
            ? `<button class="btn-view-fotos" data-id="${registro.id}">
            <i class="fas fa-image"></i> Ver Fotos (${registro.foto.length})
          </button>`
            : "Sem fotos"
        }</td>
        <td>
          <button class="action-btn btn-edit" data-id="${registro.id}">
            <i class="fas fa-edit"></i> Editar
          </button>
          <button class="action-btn btn-delete" data-id="${registro.id}">
            <i class="fas fa-trash"></i> Excluir
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    });

    // Adicionar event listeners aos botões
    document.querySelectorAll(".btn-view-fotos").forEach((btn) => {
      btn.addEventListener("click", () => {
        const registroId = btn.getAttribute("data-id");
        const registro = registros.find((r) => r.id === registroId);
        if (registro && registro.foto && registro.foto.length > 0) {
          // Implementar visualização de fotos
          alert("Visualização de fotos será implementada em breve.");
        }
      });
    });

    document.querySelectorAll(".btn-edit").forEach((btn) => {
      btn.addEventListener("click", () => {
        const registroId = btn.getAttribute("data-id");
        const registro = registros.find((r) => r.id === registroId);
        if (registro) {
          abrirModalEdicao(registro);
        }
      });
    });

    document.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const registroId = btn.getAttribute("data-id");
        if (confirm("Tem certeza que deseja excluir este registro?")) {
          await excluirRegistro(registroId);
        }
      });
    });
  }

  // Função para abrir o modal de edição
  function abrirModalEdicao(registro) {
    registroEditando = registro;

    // Preencher o formulário com os dados do registro
    document.getElementById("editar-data").value = new Date(registro.data)
        .toISOString()
        .split("T")[0];
    document.getElementById("editar-tipo-ponto").value = registro.tipoPonto;
    document.getElementById("editar-hora").value = registro.hora;

    // Exibir o modal
    document.getElementById("form-edicao").style.display = "block";
  }

  // Função para fechar o modal de edição
  function fecharModal() {
    document.getElementById("form-edicao").style.display = "none";
    registroEditando = null;
    document.getElementById("editar-form").reset();
  }

  // Função para excluir um registro
  async function excluirRegistro(registroId) {
    try {
      const response = await fetch(`${apiUrl}/registro/${registroId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Erro ao excluir registro: ${response.status}`);
      }

      alert("Registro excluído com sucesso!");

      // Atualizar a lista de registros
      if (usuarioSelecionado) {
        buscarRegistrosUsuario(usuarioSelecionado.id);
      }
    } catch (error) {
      console.error("Erro ao excluir registro:", error);
      alert(`Erro ao excluir registro: ${error.message}`);
    }
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
            const [horaEntrada, minutoEntrada] = entrada.hora.split(":").map(Number);
            const [horaAlmoco, minutoAlmoco] = almoco.hora.split(":").map(Number);
            const minutosManha = horaAlmoco * 60 + minutoAlmoco - (horaEntrada * 60 + minutoEntrada);
            minutosDia += minutosManha;
        }

        // Calcula período da tarde (retorno até saída)
        const retorno = registrosDia.find((r) => r.tipoPonto === "retorno");
        const saida = registrosDia.find((r) => r.tipoPonto === "saida");
        if (retorno && saida) {
            const [horaRetorno, minutoRetorno] = retorno.hora.split(":").map(Number);
            const [horaSaida, minutoSaida] = saida.hora.split(":").map(Number);
            const minutosTarde = horaSaida * 60 + minutoSaida - (horaRetorno * 60 + minutoRetorno);
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

  // Função para formatar horas
  function formatarHoras(horas) {
    const horasInt = Math.floor(horas);
    const minutos = Math.round((horas - horasInt) * 60);
    return `${String(horasInt).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
  }

  // Função para atualizar os cálculos
  function atualizarCalculos() {
    const calculos = calcularHorasTrabalhadas(registrosFiltrados);

    document.getElementById("horas-trabalhadas").textContent =
      calculos.horasTrabalhadas;
    document.getElementById("horas-extras").textContent = calculos.horasExtras;
    document.getElementById("horas-faltantes").textContent =
      calculos.horasFaltantes;
  }

  // Função para gerar PDF
  async function gerarPDF() {
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
      loadingDiv.innerHTML = '<div class="spinner"></div><p>Gerando relatório...</p>';
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
      doc.text(`Nome: ${usuarioSelecionado.name}`, margemEsquerda, yPos);
      yPos += 8;
      doc.text(`Email: ${usuarioSelecionado.email}`, margemEsquerda, yPos);
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
              const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
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
      const nomeArquivo = `Ponto_${usuarioSelecionado.name.replace(
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
  }

  // Event listeners
  btnFiltrarDatas.addEventListener("click", () => {
    registrosFiltrados = filtrarRegistrosPorData(
      dataInicial.value,
      dataFinal.value
    );
    atualizarTabelaRegistros();
    atualizarCalculos();
  });

  selectUser.addEventListener("change", () => {
    const userId = selectUser.value;
    if (userId) {
      const user = usuarios.find((u) => u.id === userId);
      if (user) {
        usuarioSelecionado = user;
        buscarRegistrosUsuario(user.id);
      }
    } else {
      usuarioSelecionado = null;
      registros = [];
      registrosFiltrados = [];
      atualizarTabelaRegistros();
      atualizarCalculos();
    }
  });

  btnGerarPdf.addEventListener("click", gerarPDF);

  btnLogout.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    window.location.href = "/sistema/pages/login.html";
  });

  // Event listeners para o modal
  document.querySelectorAll("#cancelar-edicao").forEach(btn => {
    btn.addEventListener("click", fecharModal);
  });

  // Fechar modal ao clicar fora dele
  window.addEventListener("click", (e) => {
    const modal = document.getElementById("form-edicao");
    if (e.target === modal) {
        fecharModal();
    }
  });

  // Event listener para o formulário de edição
  document.getElementById("editar-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!registroEditando) {
        alert("Nenhum registro selecionado para edição.");
        return;
    }

    const data = document.getElementById("editar-data").value;
    const tipoPonto = document.getElementById("editar-tipo-ponto").value;
    const hora = document.getElementById("editar-hora").value;

    try {
        const response = await fetch(
            `${apiUrl}/registro/${registroEditando.id}`,
            {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    data,
                    tipoPonto,
                    hora,
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`Erro ao atualizar registro: ${response.status}`);
        }

        alert("Registro atualizado com sucesso!");
        fecharModal();

        // Atualizar a lista de registros
        if (usuarioSelecionado) {
            buscarRegistrosUsuario(usuarioSelecionado.id);
        }
    } catch (error) {
        console.error("Erro ao atualizar registro:", error);
        alert(`Erro ao atualizar registro: ${error.message}`);
    }
  });

  // Inicializar a página
  buscarUsuarios();
  
  // Ativar o painel de usuários por padrão
  alternarPainel(panelUsuarios);
});
