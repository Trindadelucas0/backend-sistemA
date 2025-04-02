document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Nenhum usuário logado! Faça login primeiro.");
    window.location.href = "/sistema/pages/login.html";
    return;
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

        // Envia os dados para o backend
        const response = await fetch("http://localhost:3000/registro", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            data,
            tipoPonto,
            hora,
            foto: fotoBase64,
          }),
        });

        if (response.ok) {
          alert("Ponto registrado com sucesso!");
          window.location.href = "/sistema/pages/ver-registros.html"; // Redireciona para a página de registros
        } else {
          const error = await response.json();
          alert(`Erro ao registrar ponto: ${error.message}`);
        }
      } catch (err) {
        console.error("Erro ao registrar ponto:", err);
        alert("Erro no servidor. Tente novamente mais tarde.");
      }
    });

  // Navegar para a página de registros
  document
    .getElementById("ver-registros-btn")
    .addEventListener("click", function () {
      window.location.href = "/sistema/pages/ver-registros.html"; // Vai para a página de visualização dos registros
    });
});
