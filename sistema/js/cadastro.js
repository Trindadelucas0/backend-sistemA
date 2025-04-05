/**
 * Arquivo de cadastro de usuários (cadastro.js)
 * Gerencia o processo de cadastro de novos usuários no sistema.
 * Este script é carregado na página de cadastro e manipula o formulário
 * para enviar os dados do usuário para a API.
 */

// Aguarda o DOM ser completamente carregado antes de executar o código
document.addEventListener("DOMContentLoaded", function () {
  // Adiciona um listener de evento para o formulário de cadastro
  document
    .getElementById("cadastro-form")
    .addEventListener("submit", async function (event) {
      // Previne o comportamento padrão do formulário (recarregar a página)
      event.preventDefault();

      // Obtém os valores dos campos do formulário
      const nome = document.getElementById("nome").value;
      const email = document.getElementById("email").value;
      const senha = document.getElementById("senha").value;

      // Validação básica dos campos obrigatórios
      if (!nome || !email || !senha) {
        alert("Por favor, preencha todos os campos!");
        return;
      }

      try {
        // Envia os dados para a API de cadastro
        const response = await fetch(`${apiUrl}/cadastro`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          // Converte os dados do formulário para o formato esperado pela API
          body: JSON.stringify({ name: nome, email: email, password: senha }),
        });

        // Verifica se a resposta foi bem-sucedida
        if (response.ok) {
          const data = await response.json();
          alert("Cadastro realizado com sucesso!");
          window.location.href = "login.html"; // Redireciona para a página de login
        } else {
          // Tratamento de erro retornado pela API
          const error = await response.json();
          alert(`Erro no cadastro: ${error.message}`);
        }
      } catch (err) {
        // Tratamento de erros de rede ou outros erros não tratados
        console.error("Erro ao cadastrar:", err);
        alert("Erro no servidor. Tente novamente mais tarde.");
      }
    });
});
