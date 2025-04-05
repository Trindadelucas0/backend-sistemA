/**
 * Arquivo de login (login.js)
 * Gerencia o processo de autenticação de usuários no sistema.
 * Este script é carregado na página de login e manipula o formulário
 * para enviar as credenciais do usuário para a API.
 */

// Aguarda o DOM ser completamente carregado antes de executar o código
document.addEventListener("DOMContentLoaded", function () {
  // Adiciona um listener de evento para o formulário de login
  document
    .getElementById("login-form")
    .addEventListener("submit", async function (event) {
      // Previne o comportamento padrão do formulário (recarregar a página)
      event.preventDefault();

      // Obtém os valores dos campos do formulário
      const email = document.getElementById("email").value;
      const senha = document.getElementById("senha").value;

      // Validação básica dos campos obrigatórios
      if (!email || !senha) {
        alert("Por favor, preencha todos os campos!");
        return;
      }

      try {
        // Envia os dados para a API de login
        const response = await fetch(`${apiUrl}/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          // Converte os dados do formulário para o formato esperado pela API
          body: JSON.stringify({ email: email, password: senha }),
        });

        // Verifica se a resposta foi bem-sucedida
        if (response.ok) {
          const data = await response.json();

          // Salvar token e dados do usuário no localStorage para uso posterior
          localStorage.setItem("token", data.token);
          localStorage.setItem(
            "usuario",
            JSON.stringify({
              id: data.user.id,
              nome: data.user.name,
              email: data.user.email,
              isAdmin: data.user.isAdmin,
              matricula: data.user.id, // Usando o ID como matrícula temporariamente
              cargo: data.user.isAdmin ? "Administrador" : "Funcionário",
              departamento: "NÃO ADICIONADO", // Valor padrão
            })
          );

          // Log para debug - mostra os dados do usuário salvos
          console.log(
            "Dados do usuário salvos:",
            JSON.parse(localStorage.getItem("usuario"))
          );

          alert("Login realizado com sucesso!");

          // Redireciona com base no tipo de usuário (admin ou funcionário comum)
          if (data.user.isAdmin) {
            window.location.href = "admin-dashboard.html";
          } else {
            window.location.href = "registro-ponto.html";
          }
        } else {
          // Tratamento de erro retornado pela API
          const error = await response.json();
          alert(`Erro no login: ${error.message}`);
        }
      } catch (err) {
        // Tratamento de erros de rede ou outros erros não tratados
        console.error("Erro ao fazer login:", err);
        alert("Erro no servidor. Tente novamente mais tarde.");
      }
    });
});
