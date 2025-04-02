document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
  
    if (!token) {
      alert("Você precisa estar logado para acessar esta página.");
      window.location.href = "login.html";
      return;
    }
  
    try {
      const response = await fetch("http://localhost:3000/listar-usuarios", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (response.ok) {
        const data = await response.json();
        console.log("Usuários listados:", data.user);

        // Exibe os usuários na lista
        const listaUsuarios = document.getElementById("lista-usuarios");
        data.user.forEach((usuario) => {
          const li = document.createElement("li");
          li.textContent = `Nome: ${usuario.name}, Email: ${usuario.email}`;
          listaUsuarios.appendChild(li);
        });
      } else {
        const error = await response.json();
        alert(`Erro ao acessar a página: ${error.message}`);
        window.location.href = "login.html";
      }
    } catch (err) {
      console.error("Erro ao acessar a página protegida:", err);
      alert("Erro no servidor. Tente novamente mais tarde.");
      window.location.href = "login.html";
    }
  });

  // Lógica para o botão de logout
  document.getElementById("logout-button").addEventListener("click", () => {
    // Limpar todos os dados sensíveis
    sessionStorage.clear();
    localStorage.clear();
    
    // Limpar cookies relacionados à sessão
    document.cookie.split(";").forEach(cookie => {
      document.cookie = cookie
        .replace(/^ +/, "")
        .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
    });
    
    alert("Você foi desconectado com sucesso.");
    window.location.href = "login.html";
  });