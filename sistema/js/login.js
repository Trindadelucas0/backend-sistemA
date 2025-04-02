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
        const response = await fetch("http://localhost:3000/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: email, password: senha }),
        });

        if (response.ok) {
          const data = await response.json();
          
          // Validação mais robusta dos dados retornados
          if (!data.token || !data.user || !data.user.id || !data.user.name || !data.user.email) {
            throw new Error("Dados de resposta inválidos");
          }

          // Usar sessionStorage em vez de localStorage para maior segurança
          sessionStorage.setItem("token", data.token);
          sessionStorage.setItem("usuario", JSON.stringify({
            id: data.user.id,
            nome: data.user.name,
            email: data.user.email,
            matricula: data.user.id,
            cargo: "Funcionário",
            departamento: "TI"
          }));
          
          console.log("Login realizado com sucesso");
          window.location.href = "registro-ponto.html";
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