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

  // Função para alternar entre painéis
  function alternarPainel(painelAtivo) {
    // Desativar todos os painéis
    document.querySelectorAll(".panel-content").forEach(panel => {
      panel.classList.remove("active");
    });
    
    // Desativar todos os botões
    document.querySelectorAll(".nav-btn").forEach(btn => {
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
      const response = await fetch("http://localhost:3000/usuarios", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
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
    
    usuarios.forEach(user => {
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
          <span class="status-badge ${user.isBlocked ? 'status-blocked' : 'status-active'}">
            ${user.isBlocked ? 'Bloqueado' : 'Ativo'}
          </span>
        </td>
        <td>${ultimoAcesso}</td>
        <td>
          <button class="action-btn btn-view" data-id="${user.id}">
            <i class="fas fa-eye"></i> Ver Registros
          </button>
          ${user.isBlocked ? 
            `<button class="action-btn btn-unblock" data-id="${user.id}">
              <i class="fas fa-unlock"></i> Desbloquear
            </button>` : 
            `<button class="action-btn btn-block" data-id="${user.id}">
              <i class="fas fa-lock"></i> Bloquear
            </button>`
          }
        </td>
      `;
      
      tbody.appendChild(tr);
    });
    
    // Adicionar event listeners aos botões
    document.querySelectorAll(".btn-view").forEach(btn => {
      btn.addEventListener("click", () => {
        const userId = btn.getAttribute("data-id");
        const user = usuarios.find(u => u.id === userId);
        if (user) {
          usuarioSelecionado = user;
          selectUser.value = user.id;
          alternarPainel(panelRegistros);
          buscarRegistrosUsuario(user.id);
        }
      });
    });
    
    document.querySelectorAll(".btn-block, .btn-unblock").forEach(btn => {
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
    
    usuarios.forEach(user => {
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
      const response = await fetch(`http://localhost:3000/usuarios/${userId}/status`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ isBlocked })
      });

      if (!response.ok) {
        throw new Error(`Erro ao alterar status do usuário: ${response.status}`);
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
      const response = await fetch(`http://localhost:3000/usuarios/${userId}/registros`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar registros: ${response.status}`);
      }

      const data = await response.json();
      registros = data.registros;
      
      // Ordenar registros por data (mais recente primeiro)
      registros.sort((a, b) => new Date(b.data) - new Date(a.data));
      
      // Pega a data mais recente
      const dataMaisRecente = registros[0] ? new Date(registros[0].data).toISOString().split('T')[0] : null;
      
      // Define as datas inicial e final como a data mais recente
      dataInicial.value = dataMaisRecente;
      dataFinal.value = dataMaisRecente;
      
      // Filtra apenas os registros do dia mais recente
      registrosFiltrados = filtrarRegistrosPorData(dataMaisRecente, dataMaisRecente);
      
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
    
    return registros.filter(registro => {
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
    
    registrosFiltrados.forEach(registro => {
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
        <td>
          ${registro.foto && registro.foto.length > 0 ? 
            `<div class="fotos-container">
              ${registro.foto.map((foto, index) => `
                <div class="foto-item">
                  <img src="${foto}" alt="Foto ${index + 1}" class="foto-thumbnail">
                  <a href="${foto}" download="foto_${registro.tipoPonto}_${index + 1}.jpg" class="download-link">
                    <i class="fas fa-download"></i>
                  </a>
                </div>
              `).join('')}
            </div>` : 
            "Sem fotos"}
        </td>
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
    document.querySelectorAll(".btn-edit").forEach(btn => {
      btn.addEventListener("click", () => {
        const registroId = btn.getAttribute("data-id");
        const registro = registros.find(r => r.id === registroId);
        if (registro) {
          abrirModalEdicao(registro);
        }
      });
    });
    
    document.querySelectorAll(".btn-delete").forEach(btn => {
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
    document.getElementById("editar-data").value = new Date(registro.data).toISOString().split('T')[0];
    document.getElementById("editar-tipo-ponto").value = registro.tipoPonto;
    document.getElementById("editar-hora").value = registro.hora;
    
    // Exibir o modal
    formEdicao.style.display = "block";
  }

  // Função para fechar o modal de edição
  function fecharModal() {
    formEdicao.style.display = "none";
    registroEditando = null;
    editarForm.reset();
  }

  // Função para excluir um registro
  async function excluirRegistro(registroId) {
    try {
      const response = await fetch(`http://localhost:3000/registro/${registroId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
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
      
      let minutosDia = 0;
      
      // Encontra os registros do dia
      const entrada = registrosDia.find(r => r.tipoPonto === 'entrada');
      const almoco = registrosDia.find(r => r.tipoPonto === 'almoco');
      const retorno = registrosDia.find(r => r.tipoPonto === 'retorno');
      const saida = registrosDia.find(r => r.tipoPonto === 'saida');

      if (entrada && saida) {
        // Calcula período da manhã (entrada até almoço)
        if (entrada && almoco) {
          const [horaEntrada, minutoEntrada] = entrada.hora.split(':').map(Number);
          const [horaAlmoco, minutoAlmoco] = almoco.hora.split(':').map(Number);
          const minutosManha = (horaAlmoco * 60 + minutoAlmoco) - (horaEntrada * 60 + minutoEntrada);
          minutosDia += minutosManha;
        }
        
        // Calcula período da tarde (retorno até saída)
        if (retorno && saida) {
          const [horaRetorno, minutoRetorno] = retorno.hora.split(':').map(Number);
          const [horaSaida, minutoSaida] = saida.hora.split(':').map(Number);
          const minutosTarde = (horaSaida * 60 + minutoSaida) - (horaRetorno * 60 + minutoRetorno);
          minutosDia += minutosTarde;
        }
        
        // Converte minutos para horas
        const horasDia = minutosDia / 60;

        // Calcula horas extras/faltantes baseado no horário padrão (9 horas por dia)
        const horasEsperadasDia = 9; // 9 horas por dia (07:00 às 17:00 com 1 hora de almoço)
        
        // Se trabalhou mais que o esperado
        if (horasDia > horasEsperadasDia) {
          totalHorasExtras += horasDia - horasEsperadasDia;
          totalHorasTrabalhadas += horasEsperadasDia;
        } 
        // Se trabalhou menos que o esperado
        else if (horasDia < horasEsperadasDia) {
          totalHorasFaltantes += horasEsperadasDia - horasDia;
          totalHorasTrabalhadas += horasDia;
        }
        // Se trabalhou exatamente o esperado
        else {
          totalHorasTrabalhadas += horasEsperadasDia;
        }
      }
    });

    return {
      horasTrabalhadas: formatarHoras(totalHorasTrabalhadas),
      horasExtras: formatarHoras(totalHorasExtras),
      horasFaltantes: formatarHoras(totalHorasFaltantes)
    };
  }

  // Função para formatar horas no formato HH:MM
  function formatarHoras(horas) {
    const horasInt = Math.floor(horas);
    const minutos = Math.round((horas - horasInt) * 60);
    return `${horasInt.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
  }

  // Função para atualizar os cálculos
  function atualizarCalculos() {
    const calculos = calcularHorasTrabalhadas(registrosFiltrados);
    
    document.getElementById("horas-trabalhadas").textContent = calculos.horasTrabalhadas;
    document.getElementById("horas-extras").textContent = calculos.horasExtras;
    document.getElementById("horas-faltantes").textContent = calculos.horasFaltantes;
  }

  // Função para gerar PDF
  function gerarPDF() {
    if (!usuarioSelecionado) {
      alert("Selecione um usuário para gerar o relatório.");
      return;
    }
    
    if (registrosFiltrados.length === 0) {
      alert("Não há registros para gerar o relatório.");
      return;
    }
    
    // Criar o documento PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.text(`Registros de Ponto - ${usuarioSelecionado.name}`, 20, 20);
    
    // Período
    doc.setFontSize(12);
    doc.text(`Período: ${dataInicial.value} a ${dataFinal.value}`, 20, 30);
    
    // Cabeçalho da tabela
    doc.setFontSize(10);
    doc.text("Data", 20, 40);
    doc.text("Tipo", 50, 40);
    doc.text("Horário", 80, 40);
    
    // Dados da tabela
    let y = 50;
    registrosFiltrados.forEach(registro => {
      const data = new Date(registro.data).toLocaleDateString("pt-BR");
      
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
      
      doc.text(data, 20, y);
      doc.text(tipoPontoFormatado, 50, y);
      doc.text(registro.hora, 80, y);
      
      y += 10;
      
      // Verificar se precisa de nova página
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
    
    // Resumo
    const calculos = calcularHorasTrabalhadas(registrosFiltrados);
    y += 10;
    doc.text(`Horas Trabalhadas: ${calculos.horasTrabalhadas}`, 20, y);
    y += 10;
    doc.text(`Horas Extras: ${calculos.horasExtras}`, 20, y);
    y += 10;
    doc.text(`Horas Faltantes: ${calculos.horasFaltantes}`, 20, y);
    
    // Rodapé
    const dataAtual = new Date().toLocaleDateString("pt-BR");
    const horaAtual = new Date().toLocaleTimeString("pt-BR");
    y = 280;
    doc.setFontSize(8);
    doc.text(`Relatório gerado por ${usuario.nome} em ${dataAtual} às ${horaAtual}`, 20, y);
    
    // Salvar o PDF
    doc.save(`registros_${usuarioSelecionado.name}_${dataInicial.value}_${dataFinal.value}.pdf`);
  }

  // Event listeners
  btnFiltrarDatas.addEventListener("click", () => {
    registrosFiltrados = filtrarRegistrosPorData(dataInicial.value, dataFinal.value);
    atualizarTabelaRegistros();
    atualizarCalculos();
  });

  selectUser.addEventListener("change", () => {
    const userId = selectUser.value;
    if (userId) {
      const user = usuarios.find(u => u.id === userId);
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

  cancelarEdicaoBtn.addEventListener("click", fecharModal);

  editarForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    if (!registroEditando) {
      alert("Nenhum registro selecionado para edição.");
      return;
    }
    
    const data = document.getElementById("editar-data").value;
    const tipoPonto = document.getElementById("editar-tipo-ponto").value;
    const hora = document.getElementById("editar-hora").value;
    
    try {
      const response = await fetch(`http://localhost:3000/registro/${registroEditando.id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          data,
          tipoPonto,
          hora
        })
      });

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
}); 