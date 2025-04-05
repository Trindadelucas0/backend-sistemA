/**
 * Arquivo de registro de ponto (registro.js)
 * Gerencia o processo de registro de ponto dos usuários.
 * Este script permite que os usuários registrem entradas, saídas e outros tipos de ponto,
 * incluindo o upload de fotos para comprovação.
 */

// Aguarda o DOM ser completamente carregado antes de executar o código
document.addEventListener("DOMContentLoaded", function () {
  // Verifica se existe um token de autenticação no localStorage
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

  // Preencher a data atual no campo de data
  const hoje = new Date().toISOString().split("T")[0];
  document.getElementById("data").value = hoje;

  // Adiciona um listener de evento para o formulário de registro de ponto
  document
    .getElementById("ponto-form")
    .addEventListener("submit", async function (event) {
      // Previne o comportamento padrão do formulário (recarregar a página)
      event.preventDefault();

      // Obtém os valores dos campos do formulário
      const nome = document.getElementById("nome").value.trim();
      const data = document.getElementById("data").value.trim();
      const tipoPonto = document.getElementById("tipo-ponto").value.trim();
      const hora = document.getElementById("hora").value.trim();
      const foto = document.getElementById("foto").files;

      // Log para debug - mostra os dados do formulário
      console.log("Dados do formulário:", {
        nome,
        data,
        tipoPonto,
        hora,
        fotos: foto.length,
      });

      // Validação básica dos campos obrigatórios
      if (!data || !tipoPonto || !hora || foto.length === 0) {
        alert("Preencha todos os campos e selecione ao menos uma foto!");
        return;
      }

      // Confirmação do usuário antes de enviar os dados
      const confirmar = confirm(`${nome} Deseja prosseguir com os dados? 
            Data: ${data}
            Tipo de Ponto: ${tipoPonto}
            Horário: ${hora}`);
      if (!confirmar) {
        alert(`REGISTRO CANCELADO! TENTE NOVAMENTE!`);
        return;
      }

      try {
        // Mostrar indicador de carregamento no botão
        const botao = document.getElementById("botao");
        const textoOriginal = botao.textContent;
        botao.textContent = "Registrando...";
        botao.disabled = true;

        // Converte as fotos para base64 para envio ao servidor
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

        // Verificar token novamente antes de enviar para garantir que ainda é válido
        const tokenAtual = localStorage.getItem("token");
        if (!tokenAtual) {
          throw new Error(
            "Token não encontrado. Por favor, faça login novamente."
          );
        }

        console.log("Enviando dados para o backend...");
        // Envia os dados para o backend
        const response = await fetch(`${apiUrl}/registro`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenAtual}`, // Inclui o token no cabeçalho de autorização
          },
          body: JSON.stringify({
            data,
            tipoPonto,
            hora,
            foto: fotoBase64,
          }),
        });

        console.log("Resposta do servidor:", response.status);

        // Verifica se a resposta foi bem-sucedida
        if (response.ok) {
          const data = await response.json();
          console.log("Resposta completa:", data);
          alert("Ponto registrado com sucesso!");
          window.location.href = "/sistema/pages/ver-registros.html"; // Redireciona para a página de registros
        } else {
          // Tratamento de erro retornado pela API
          const error = await response.json();
          console.error("Erro na resposta:", error);
          alert(`Erro ao registrar ponto: ${error.message}`);
        }
      } catch (err) {
        // Tratamento de erros de rede ou outros erros não tratados
        console.error("Erro ao registrar ponto:", err);
        alert(`Erro ao registrar ponto: ${err.message}`);
      } finally {
        // Restaurar o botão ao estado original
        const botao = document.getElementById("botao");
        botao.textContent = textoOriginal;
        botao.disabled = false;
      }
    });

  // Adiciona um listener para o botão de visualizar registros
  document
    .getElementById("ver-registros-btn")
    .addEventListener("click", function () {
      window.location.href = "/sistema/pages/ver-registros.html"; // Vai para a página de visualização dos registros
    });
});

/**
 * Função para fazer logout do usuário
 * Remove os dados de autenticação do localStorage e redireciona para a página de login
 */
function fazerLogout() {
  // Limpa os dados de autenticação
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  
  // Redireciona para a página de login
  window.location.href = 'login.html';
}