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
          alert("Login realizado com sucesso!");
          localStorage.setItem("token", data.token); // Armazena o token no localStorage
          window.location.href = "pagina-protegida.html"; // Redireciona para a página protegida
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