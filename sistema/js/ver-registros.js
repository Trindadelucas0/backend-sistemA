document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Nenhum usuário logado! Faça login primeiro.");
    window.location.href = "/pages/login.html";
    return;
  }

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

  // Função para editar um campo específico
  window.editarCampo = function (index, campo) {
    registroEditando = registros[index].id; // Define o ID do registro que será editado
    campoEditando = campo; // Define o campo que será editado
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
    }
  };

  // Função para formatar a data no formato local
  function formatarDataLocal(data) {
    const dataObj = new Date(data);
    return dataObj.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Sao_Paulo", // Ajustando para o fuso do Brasil
    });
  }

  // Função para ajustar a data no formato ISO
  function ajustarData(data) {
    const dataObj = new Date(data + "T00:00:00");
    return dataObj.toISOString().split("T")[0];
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

  // Buscar registros ao carregar a página
  buscarRegistros();
});
