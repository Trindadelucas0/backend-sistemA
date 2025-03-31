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

  // Função para formatar horas no formato HH:MM
  function formatarHoras(horas) {
    const horasInt = Math.floor(horas);
    const minutos = Math.round((horas - horasInt) * 60);
    return `${horasInt.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
  }

  // Função para calcular horas trabalhadas
  function calcularHorasTrabalhadas(registros, cargaHoraria) {
    // Agrupa os registros por data
    const registrosPorData = {};
    registros.forEach(registro => {
      const data = new Date(registro.data).toISOString().split('T')[0];
      if (!registrosPorData[data]) {
        registrosPorData[data] = [];
      }
      registrosPorData[data].push(registro);
    });

    let totalHorasTrabalhadas = 0;
    let totalHorasExtras = 0;
    let totalHorasFaltantes = 0;

    // Para cada dia
    Object.values(registrosPorData).forEach(registrosDia => {
      // Ordena os registros por hora
      registrosDia.sort((a, b) => a.hora.localeCompare(b.hora));
      
      let horasDia = 0;
      let ultimoRegistro = null;
      
      registrosDia.forEach(registro => {
        if (ultimoRegistro) {
          // Se o último registro foi saída para almoço e este é retorno
          if (ultimoRegistro.tipoPonto === "almoco" && registro.tipoPonto === "retorno") {
            // Não soma as horas do almoço
            ultimoRegistro = registro;
            return;
          }
          
          const hora1 = new Date(`2000-01-01T${ultimoRegistro.hora}`);
          const hora2 = new Date(`2000-01-01T${registro.hora}`);
          const diff = (hora2 - hora1) / (1000 * 60 * 60); // Diferença em horas
          horasDia += diff;
        }
        ultimoRegistro = registro;
      });

      // Compara com a carga horária
      const cargaHorariaNum = parseFloat(cargaHoraria);
      if (horasDia > cargaHorariaNum) {
        totalHorasExtras += horasDia - cargaHorariaNum;
      } else {
        totalHorasFaltantes += cargaHorariaNum - horasDia;
      }
      totalHorasTrabalhadas += horasDia;
    });

    return {
      horasTrabalhadas: formatarHoras(totalHorasTrabalhadas),
      horasExtras: formatarHoras(totalHorasExtras),
      horasFaltantes: formatarHoras(totalHorasFaltantes)
    };
  }

  // Adiciona o evento de clique no botão de calcular horas
  document.getElementById('calcular-horas').addEventListener('click', function() {
    const cargaHoraria = document.getElementById('carga-horaria').value;
    if (!cargaHoraria) {
      alert('Por favor, insira a carga horária diária');
      return;
    }

    // Valida o formato da carga horária (HH:MM)
    if (!/^\d{2}:\d{2}$/.test(cargaHoraria)) {
      alert('Por favor, insira a carga horária no formato HH:MM (ex: 08:00)');
      return;
    }

    // Converte a carga horária para número decimal
    const [horas, minutos] = cargaHoraria.split(':').map(Number);
    const cargaHorariaDecimal = horas + minutos / 60;

    const resultado = calcularHorasTrabalhadas(registros, cargaHorariaDecimal);
    
    document.getElementById('horas-trabalhadas').textContent = resultado.horasTrabalhadas;
    document.getElementById('horas-extras').textContent = resultado.horasExtras;
    document.getElementById('horas-faltantes').textContent = resultado.horasFaltantes;
  });

  // Buscar registros ao carregar a página
  buscarRegistros();
});
