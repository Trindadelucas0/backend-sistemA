document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("cadastro-form")
    .addEventListener("submit", async function (event) {
      event.preventDefault();

      const nome = document.getElementById("nome").value;
      const email = document.getElementById("email").value;
      const senha = document.getElementById("senha").value;

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
          body: JSON.stringify({ name: nome, email: email, password: senha }),
        });

        if (response.ok) {
          const data = await response.json();
          alert("Cadastro realizado com sucesso!");
          window.location.href = "login.html"; // Redireciona para a página de login
        } else {
          const error = await response.json();
          alert(`Erro no cadastro: ${error.message}`);
        }
      } catch (err) {
        console.error("Erro ao cadastrar:", err);
        alert("Erro no servidor. Tente novamente mais tarde.");
      }
    });
});
