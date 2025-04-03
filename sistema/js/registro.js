document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Nenhum usuário logado! Faça login primeiro.");
    window.location.href = "/sistema/pages/login.html";
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
    }
  }

  // Preencher a data atual
  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById("data").value = hoje;

  document
    .getElementById("ponto-form")
    .addEventListener("submit", async function (event) {
      event.preventDefault();

      const nome = document.getElementById("nome").value.trim();
      const data = document.getElementById("data").value.trim();
      const tipoPonto = document.getElementById("tipo-ponto").value.trim();
      const hora = document.getElementById("hora").value.trim();
      const foto = document.getElementById("foto").files;

      console.log("Dados do formulário:", { nome, data, tipoPonto, hora, fotos: foto.length });

      if (!data || !tipoPonto || !hora || foto.length === 0) {
        alert("Preencha todos os campos e selecione ao menos uma foto!");
        return;
      }

      const confirmar = confirm(`${nome} Deseja prosseguir com os dados? 
            Data: ${data}
            Tipo de Ponto: ${tipoPonto}
            Horário: ${hora}`);
      if (!confirmar) {
        alert(`REGISTRO CANCELADO! TENTE NOVAMENTE!`);
        return;
      }

      try {
        // Mostrar indicador de carregamento
        const botao = document.getElementById("botao");
        const textoOriginal = botao.textContent;
        botao.textContent = "Registrando...";
        botao.disabled = true;

        // Converte as fotos para base64
        console.log("Convertendo fotos para base64...");
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
        console.log("Fotos convertidas com sucesso");

        // Verificar token novamente antes de enviar
        const tokenAtual = localStorage.getItem("token");
        if (!tokenAtual) {
          throw new Error("Token não encontrado. Por favor, faça login novamente.");
        }

        console.log("Enviando dados para o backend...");
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

        console.log("Resposta do servidor:", response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log("Resposta completa:", data);
          alert("Ponto registrado com sucesso!");
          window.location.href = "/sistema/pages/ver-registros.html"; // Redireciona para a página de registros
        } else {
          const error = await response.json();
          console.error("Erro na resposta:", error);
          alert(`Erro ao registrar ponto: ${error.message}`);
        }
      } catch (err) {
        console.error("Erro ao registrar ponto:", err);
        alert(`Erro ao registrar ponto: ${err.message}`);
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
      window.location.href = "/sistema/pages/ver-registros.html"; // Vai para a página de visualização dos registros
    });
});
