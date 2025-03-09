document.addEventListener("DOMContentLoaded", function() 
{
    carregarTarefas();
});

async function carregarTarefas() 
{
    const resposta = await fetch("http://127.0.0.1:5000/tasks");
    const tarefas = await resposta.json();

    document.getElementById("todo-list").innerHTML = "";
    document.getElementById("inProgress-list").innerHTML = "";
    document.getElementById("done-list").innerHTML = "";

    tarefas.forEach(tarefa => 
    {
        let colunaId = "";
        
        if (tarefa.status === "todo") colunaId = "todo-list";
        else if (tarefa.status === "inProgress") colunaId = "inProgress-list";
        else if (tarefa.status === "done") colunaId = "done-list";
        
        let coluna = document.getElementById(colunaId);
        if (coluna) 
        {
            const dataFormatada = formatarData(tarefa.data);
            let elementoTarefa = criarElementoTarefa(tarefa.id, tarefa.nome, dataFormatada);
            coluna.appendChild(elementoTarefa);
        }
    });
}

function formatarData(dataString) 
{
    if (dataString && dataString.includes("-")) 
    {
        const [ano, mes, dia] = dataString.split("T")[0].split("-");
        return `${dia}/${mes}/${ano}`;
    }
    return dataString || "Sem data";
}

async function adicionarTarefa() 
{
    let entradaTarefa = document.getElementById("taskInput");
    let dataTarefa = document.getElementById("taskDate");

    if (entradaTarefa.value.trim() === "") return;
    
    const resposta = await fetch("http://127.0.0.1:5000/tasks", 
    {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
        {
            nome: entradaTarefa.value,
            data: dataTarefa.value,
            status: "todo"
        })
    });

    if (resposta.ok) 
    {
        carregarTarefas();
    }

    entradaTarefa.value = "";
    dataTarefa.value = "";
}

function criarElementoTarefa(id, nome, data) 
{
    let div = document.createElement("div");
    div.classList.add("task");
    div.draggable = true;
    div.ondragstart = arrastar;
    div.dataset.id = id;
    
    div.innerHTML = `
        <p><strong>${nome}</strong></p>
        <p>${data}</p>
        <div class="task-actions">
            <button onclick="editarTarefa(this)">✏️</button>
            <button onclick="excluirTarefa(this)">❌</button>
        </div>
    `;
    
    return div;
}

async function excluirTarefa(botao) 
{
    let divTarefa = botao.closest(".task");
    let idTarefa = divTarefa.dataset.id;

    const resposta = await fetch(`http://127.0.0.1:5000/tasks/${idTarefa}`, {
        method: "DELETE"
    });

    if (resposta.ok) {
        carregarTarefas();
    }
}

function arrastar(evento) 
{
    evento.dataTransfer.setData("idTarefa", evento.target.dataset.id);
}

function permitirSoltar(evento) 
{
    evento.preventDefault();
}

async function soltar(evento) 
{
    evento.preventDefault();
    let idTarefa = evento.dataTransfer.getData("idTarefa");
    let novoStatus = evento.target.closest(".task-list").id.replace("-list", "");

    const resposta = await fetch(`http://127.0.0.1:5000/tasks/${idTarefa}`, 
    {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus })
    });

    if (resposta.ok) 
    {
        carregarTarefas();
    }
}

function editarTarefa(botao) 
{
    alert("Funcionalidade de edição não implementada");
}