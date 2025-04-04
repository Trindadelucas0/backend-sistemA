document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");
  if (!token) {
    window.notificationSystem.show('error', 'Erro de Autenticação', 'Nenhum usuário logado! Faça login primeiro.');
    setTimeout(() => {
      window.location.href = "/sistema/pages/login.html";
    }, 2000);
    return;
  }

  // Preencher o campo de nome com o nome do usuário logado
  const usuarioStr = localStorage.getItem("usuario");
  if (usuarioStr) {
    try {
      const usuario = JSON.parse(usuarioStr);
      if (usuario && usuario.nome) {
        document.getElementById("nome").value = usuario.nome;
      }
    } catch (error) {
      console.error("Erro ao processar dados do usuário:", error);
      window.notificationSystem.show('error', 'Erro', 'Erro ao carregar dados do usuário');
    }
  }

  // Preencher a data atual
  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById("data").value = hoje;

  // Função para mostrar o modal de confirmação
  function showConfirmModal(message) {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirm-modal');
      const messageEl = document.getElementById('confirm-message');
      const yesBtn = document.getElementById('confirm-yes');
      const noBtn = document.getElementById('confirm-no');

      messageEl.textContent = message;
      modal.style.display = 'block';

      yesBtn.onclick = () => {
        modal.style.display = 'none';
        resolve(true);
      };

      noBtn.onclick = () => {
        modal.style.display = 'none';
        resolve(false);
      };
    });
  }

  document
    .getElementById("ponto-form")
    .addEventListener("submit", async function (event) {
      event.preventDefault();

      const nome = document.getElementById("nome").value.trim();
      const data = document.getElementById("data").value.trim();
      const tipoPonto = document.getElementById("tipo-ponto").value.trim();
      const hora = document.getElementById("hora").value.trim();
      const foto = document.getElementById("foto").files;

      if (!data || !tipoPonto || !hora || foto.length === 0) {
        window.notificationSystem.show(
          'warning',
          'Campos Obrigatórios',
          'Preencha todos os campos e selecione ao menos uma foto!'
        );
        return;
      }

      const confirmMessage = `${nome}, confirme os dados:\nData: ${data}\nTipo de Ponto: ${tipoPonto}\nHorário: ${hora}`;
      const confirmed = await showConfirmModal(confirmMessage);

      if (!confirmed) {
        window.notificationSystem.show('info', 'Cancelado', 'Registro cancelado pelo usuário');
        return;
      }

      try {
        // Mostrar indicador de carregamento
        const botao = document.getElementById("botao");
        const textoOriginal = botao.textContent;
        botao.textContent = "Registrando...";
        botao.disabled = true;

        // Converte as fotos para base64
        const fotoBase64 = await Promise.all(
          Array.from(foto).map((file) => {
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (event) => resolve(event.target.result);
              reader.onerror = (error) => reject(error);
              reader.readAsDataURL(file);
            });
          })
        );

        // Verificar token novamente antes de enviar
        const tokenAtual = localStorage.getItem("token");
        if (!tokenAtual) {
          throw new Error("Token não encontrado. Por favor, faça login novamente.");
        }

        // Envia os dados para o backend
        const response = await fetch("http://localhost:3000/registro", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${tokenAtual}`,
          },
          body: JSON.stringify({
            data,
            tipoPonto,
            hora,
            foto: fotoBase64,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          window.notificationSystem.show(
            'success',
            'Sucesso!',
            'Ponto registrado com sucesso!'
          );
          
          // Verificar pontos pendentes após o registro
          window.pendingPointsReminder.checkPendingPoints();
          
          // Redirecionar após um breve delay
          setTimeout(() => {
            window.location.href = "/sistema/pages/ver-registros.html";
          }, 1500);
        } else {
          const error = await response.json();
          window.notificationSystem.show(
            'error',
            'Erro',
            `Erro ao registrar ponto: ${error.message}`
          );
        }
      } catch (err) {
        console.error("Erro ao registrar ponto:", err);
        window.notificationSystem.show(
          'error',
          'Erro',
          `Erro ao registrar ponto: ${err.message}`
        );
      } finally {
        // Restaurar o botão
        const botao = document.getElementById("botao");
        botao.textContent = textoOriginal;
        botao.disabled = false;
      }
    });

  // Navegar para a página de registros
  document
    .getElementById("ver-registros-btn")
    .addEventListener("click", function () {
      window.location.href = "/sistema/pages/ver-registros.html";
    });
});
