document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("login-form")
    .addEventListener("submit", async function (event) {
      event.preventDefault();

      const email = document.getElementById("email").value;
      const senha = document.getElementById("senha").value;

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
          body: JSON.stringify({ email: email, password: senha }),
        });

        if (response.ok) {
          const data = await response.json();

          // Salvar token e dados do usuário
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
              departamento: "TI", // Valor padrão
            })
          );

          console.log(
            "Dados do usuário salvos:",
            JSON.parse(localStorage.getItem("usuario"))
          ); // Log para debug

          alert("Login realizado com sucesso!");

          // Redireciona com base no tipo de usuário
          if (data.user.isAdmin) {
            window.location.href = "admin-dashboard.html";
          } else {
            window.location.href = "registro-ponto.html";
          }
        } else {
          const error = await response.json();
          alert(`Erro no login: ${error.message}`);
        }
      } catch (err) {
        console.error("Erro ao fazer login:", err);
        alert("Erro no servidor. Tente novamente mais tarde.");
      }
    });
});
