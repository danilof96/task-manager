let categoriaSelecionada = "";

document.addEventListener("DOMContentLoaded", function() 
{
    carregarConfiguracoes();
    configurarControles();
    carregarTarefas();
});

function configurarControles() 
{
    const darkModeToggle = document.getElementById("darkModeToggle");
    darkModeToggle.addEventListener("change", function() 
    {
        document.body.classList.toggle("dark-mode");
        salvarConfiguracoes();
    });
    const seletoresCores = document.querySelectorAll(".color-picker input[type='color']");
    seletoresCores.forEach(seletor => 
    {
        seletor.addEventListener("input", function() 
        {
            atualizarCoresColunas();
            salvarConfiguracoes();
        });
    });
}

function carregarConfiguracoes() 
{
    const configs = JSON.parse(localStorage.getItem("taskManagerConfig")) || {
        darkMode: false,
        coresColunas: {
            todoColor1: "#ff7b7b",
            todoColor2: "#ff5252",
            inProgressColor1: "#ffdd57",
            inProgressColor2: "#ffcc00",
            doneColor1: "#66d37e",
            doneColor2: "#28a745"
        }
    };
    if (configs.darkMode) 
    {
        document.body.classList.add("dark-mode");
        document.getElementById("darkModeToggle").checked = true;
    }
    Object.keys(configs.coresColunas).forEach(key => 
    {
        const element = document.getElementById(key);
        if (element) 
        {
            element.value = configs.coresColunas[key];
        }
    });
    atualizarCoresColunas();
}

function salvarConfiguracoes() 
{
    const darkMode = document.body.classList.contains("dark-mode");
    const coresColunas = 
    {
        todoColor1: document.getElementById("todoColor1").value,
        todoColor2: document.getElementById("todoColor2").value,
        inProgressColor1: document.getElementById("inProgressColor1").value,
        inProgressColor2: document.getElementById("inProgressColor2").value,
        doneColor1: document.getElementById("doneColor1").value,
        doneColor2: document.getElementById("doneColor2").value
    };
    localStorage.setItem("taskManagerConfig", JSON.stringify({
        darkMode,
        coresColunas
    }));
}

function atualizarCoresColunas() 
{
    const todoColor1 = document.getElementById("todoColor1").value;
    const todoColor2 = document.getElementById("todoColor2").value;
    const inProgressColor1 = document.getElementById("inProgressColor1").value;
    const inProgressColor2 = document.getElementById("inProgressColor2").value;
    const doneColor1 = document.getElementById("doneColor1").value;
    const doneColor2 = document.getElementById("doneColor2").value;
    document.documentElement.style.setProperty('--custom-todo-color1', todoColor1);
    document.documentElement.style.setProperty('--custom-todo-color2', todoColor2);
    document.documentElement.style.setProperty('--custom-inprogress-color1', inProgressColor1);
    document.documentElement.style.setProperty('--custom-inprogress-color2', inProgressColor2);
    document.documentElement.style.setProperty('--custom-done-color1', doneColor1);
    document.documentElement.style.setProperty('--custom-done-color2', doneColor2);
    document.documentElement.style.setProperty(
        '--todo-bg', 
        `linear-gradient(to right, ${todoColor1}, ${todoColor2})`
    );
    document.documentElement.style.setProperty(
        '--inprogress-bg', 
        `linear-gradient(to right, ${inProgressColor1}, ${inProgressColor2})`
    );
    document.documentElement.style.setProperty(
        '--done-bg', 
        `linear-gradient(to right, ${doneColor1}, ${doneColor2})`
    );
}

async function carregarTarefas() 
{
    try {
        const resposta = await fetch("http://127.0.0.1:5000/task-manager");
        const tarefas = await resposta.json();
        const todoList = document.getElementById("todo-list");
        const inProgressList = document.getElementById("inProgress-list");
        const doneList = document.getElementById("done-list");
        const existingIds = 
        {
            "todo-list": Array.from(todoList.querySelectorAll('.task')).map(el => el.dataset.id),
            "inProgress-list": Array.from(inProgressList.querySelectorAll('.task')).map(el => el.dataset.id),
            "done-list": Array.from(doneList.querySelectorAll('.task')).map(el => el.dataset.id)
        };
        const novoIds = 
        {
            "todo-list": [],
            "inProgress-list": [],
            "done-list": []
        };
        tarefas.forEach(tarefa => 
        {
            let colunaId = "";
            
            if (tarefa.status === "todo") colunaId = "todo-list";
            else if (tarefa.status === "inProgress") colunaId = "inProgress-list";
            else if (tarefa.status === "done") colunaId = "done-list";
            
            let coluna = document.getElementById(colunaId);
            if (coluna) 
            {
                const dataFormatada = tarefa.data || "Sem data";
                novoIds[colunaId].push(tarefa.id.toString());
                const tarefaExistente = coluna.querySelector(`.task[data-id="${tarefa.id}"]`);
                
                if (tarefaExistente) 
                {
                    if (tarefaExistente.dataset.nome !== tarefa.nome || tarefaExistente.dataset.data !== dataFormatada) 
                    {
                        tarefaExistente.dataset.nome = tarefa.nome;
                        tarefaExistente.dataset.data = dataFormatada;
                        tarefaExistente.querySelector('strong').textContent = tarefa.nome;
                        tarefaExistente.querySelectorAll('p')[1].textContent = dataFormatada;
                    }
                } 
                else 
                {
                    let tarefaMovida = null;
                    const colunas = ["todo-list", "inProgress-list", "done-list"];               
                    for (const col of colunas) 
                    {
                        if (col !== colunaId) 
                        {
                            tarefaMovida = document.getElementById(col).querySelector(`.task[data-id="${tarefa.id}"]`);
                            if (tarefaMovida) break;
                        }
                    }
                    
                    if (tarefaMovida) 
                    {
                        tarefaMovida.classList.add('moving');
                        if (tarefaMovida.dataset.nome !== tarefa.nome || tarefaMovida.dataset.data !== dataFormatada) 
                        {
                            tarefaMovida.dataset.nome = tarefa.nome;
                            tarefaMovida.dataset.data = dataFormatada;
                            tarefaMovida.querySelector('strong').textContent = tarefa.nome;
                            tarefaMovida.querySelectorAll('p')[1].textContent = dataFormatada;
                        }
                        setTimeout(() => 
                        {
                            coluna.appendChild(tarefaMovida);
                            setTimeout(() => 
                            {
                                tarefaMovida.classList.remove('moving');
                                tarefaMovida.classList.add('arrived');
                                setTimeout(() => 
                                {
                                    tarefaMovida.classList.remove('arrived');
                                }, 500);
                            }, 10);
                        }, 100);
                    } 
                    else 
                    {
                        let elementoTarefa = criarElementoTarefa(tarefa.id, tarefa.nome, dataFormatada, tarefa.categoria);
                        elementoTarefa.classList.add('new-task');
                        coluna.appendChild(elementoTarefa);
                        setTimeout(() => 
                        {
                            elementoTarefa.classList.add('show');
                        }, 10);
                        setTimeout(() => 
                        {
                            elementoTarefa.classList.remove('new-task', 'show');
                        }, 800);
                    }
                }
            }
        });

        Object.keys(existingIds).forEach(colId => 
        {
            const coluna = document.getElementById(colId);
            existingIds[colId].forEach(id => 
            {
                if (!novoIds[colId].includes(id)) 
                {
                    const tarefa = coluna.querySelector(`.task[data-id="${id}"]`);
                    if (tarefa) 
                    {
                        tarefa.classList.add('removing');
                        setTimeout(() => 
                        {
                            tarefa.remove();
                        }, 300);
                    }
                }
            });
        });
        
    } catch (erro) 
    {
        console.error("Erro ao carregar tarefas:", erro);
    }
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
    const botaoAdicionar = document.querySelector('.task-form button');
    botaoAdicionar.classList.add('clicked');
    setTimeout(() => botaoAdicionar.classList.remove('clicked'), 300);
    
    try {
        const resposta = await fetch("http://127.0.0.1:5000/task-manager", 
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nome: entradaTarefa.value,
                data: dataTarefa.value,
                status: "todo",
                categoria: categoriaSelecionada || "casa"
            })
        });

        if (resposta.ok) 
        {
            const novaTarefa = await resposta.json();
            const todoList = document.getElementById("todo-list");
            const elementoTarefa = criarElementoTarefa(
                novaTarefa.id, 
                novaTarefa.nome, 
                novaTarefa.data || "Sem data",
                novaTarefa.categoria
            );
    
            elementoTarefa.classList.add('new-task');
            todoList.prepend(elementoTarefa);
            setTimeout(() => 
                {
                elementoTarefa.classList.add('show');
                setTimeout(() => 
                {
                    elementoTarefa.classList.remove('new-task', 'show');
                }, 800);
            }, 10);
        }
    } catch (erro) 
    {
        console.error("Erro ao adicionar tarefa:", erro);
    }

    entradaTarefa.value = "";
    dataTarefa.value = "";
    document.querySelectorAll('.category-option').forEach(option => 
    {
        option.classList.remove('selected');
    });
    categoriaSelecionada = "";
}

function criarElementoTarefa(id, nome, data, categoria = "") 
{
    let div = document.createElement("div");
    div.classList.add("task");
    div.draggable = true;
    div.ondragstart = arrastar;
    div.dataset.id = id;
    div.dataset.nome = nome;
    div.dataset.data = data;
    div.dataset.categoria = categoria;
    
    let iconeCategoria = "";
    switch(categoria) {
        case "casa":
            iconeCategoria = "🏠";
            break;
        case "trabalho":
            iconeCategoria = "💼";
            break;
        case "estudo":
            iconeCategoria = "📚";
            break;
        default:
            iconeCategoria = "";
    }
    
    div.innerHTML = `
        <p>${iconeCategoria ? `<span class="task-category-icon">${iconeCategoria}</span>` : ''}<strong>${nome}</strong></p>
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
    divTarefa.classList.add('removing');
    
    try {
        const resposta = await fetch(`http://127.0.0.1:5000/task-manager/${idTarefa}`, 
        {
            method: "DELETE"
        });

        if (resposta.ok) 
        {
            setTimeout(() =>
            {
                divTarefa.remove();
            }, 300);
        }
    } catch (erro) 
    {
        console.error("Erro ao excluir tarefa:", erro);
        divTarefa.classList.remove('removing');
    }
}

function arrastar(evento) 
{
    evento.dataTransfer.setData("idTarefa", evento.target.dataset.id);
    evento.target.classList.add('dragging');
    const ghostElement = evento.target.cloneNode(true);
    ghostElement.classList.add('drag-ghost');
    ghostElement.style.width = evento.target.offsetWidth + 'px';
    document.body.appendChild(ghostElement);
    evento.dataTransfer.setDragImage(ghostElement, ghostElement.offsetWidth / 2, 20);  
    setTimeout(() => 
    {
        document.body.removeChild(ghostElement);
    }, 0);
}

function permitirSoltar(evento) 
{
    evento.preventDefault();
    const colunaAlvo = evento.target.closest(".task-column") || evento.target.closest(".task-list");
    if (colunaAlvo) 
    {
        const taskList = colunaAlvo.querySelector('.task-list');
        if (taskList) 
        {
            taskList.classList.add('drop-target');
        }
    }
}

function arrastarSaindo(evento) 
{
    document.querySelectorAll('.task-list').forEach(list => 
    {
        list.classList.remove('drop-target');
    });
}

function selecionarCategoria(elemento) 
{
    document.querySelectorAll('.category-option').forEach(option => 
    {
        option.classList.remove('selected');
    });
    
    elemento.classList.add('selected');
    categoriaSelecionada = elemento.dataset.category;
}

async function soltar(evento) 
{
    evento.preventDefault();
    
    document.querySelectorAll('.task-list').forEach(list => 
    {
        list.classList.remove('drop-target');
    });
    
    document.querySelectorAll('.task').forEach(task => 
    {
        task.classList.remove('dragging');
    });
    
    let idTarefa = evento.dataTransfer.getData("idTarefa");
    let colunaAlvo = evento.target.closest(".task-column") || evento.target.closest(".task-list");
    
    if (!colunaAlvo) return;
    
    let novoStatus;
    
    if (colunaAlvo.classList.contains("task-list")) 
    {
        novoStatus = colunaAlvo.id.replace("-list", "");
    } 
    else 
    {
        novoStatus = colunaAlvo.id;
    }
    
    const tarefaArrastada = document.querySelector(`.task[data-id="${idTarefa}"]`);
    if (!tarefaArrastada) return;
    tarefaArrastada.classList.add('moving');
    
    try {
        const resposta = await fetch(`http://127.0.0.1:5000/task-manager/${idTarefa}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: novoStatus })
        });

        if (resposta.ok) 
        {
            const listaAlvo = colunaAlvo.classList.contains("task-list") 
                ? colunaAlvo 
                : colunaAlvo.querySelector(".task-list");
            
            if (listaAlvo) 
            {
                listaAlvo.appendChild(tarefaArrastada);
                
                setTimeout(() => 
                {
                    tarefaArrastada.classList.remove('moving');
                    tarefaArrastada.classList.add('arrived');
                    
                    setTimeout(() => 
                    {
                        tarefaArrastada.classList.remove('arrived');
                    }, 500);
                }, 10);
            }
        }
    } catch (erro) 
    {
        console.error("Erro ao mover tarefa:", erro);
        tarefaArrastada.classList.remove('moving');
    }
}

function editarTarefa(botao) 
{
    let divTarefa = botao.closest(".task");
    let idTarefa = divTarefa.dataset.id;
    let nomeTarefa = divTarefa.dataset.nome;
    let dataTarefa = divTarefa.dataset.data;
    let categoriaTarefa = divTarefa.dataset.categoria || "";
    
    divTarefa.dataset.originalContent = divTarefa.innerHTML;
    
    let dataISO = "";
    if (dataTarefa && dataTarefa !== "Sem data") {
        const [dia, mes, ano] = dataTarefa.split("/");
        dataISO = `${ano}-${mes}-${dia}`;
    }
    
    let opcoesCategoria = `
        <div class="category-selector" style="margin: 8px 0">
            <div class="category-option ${categoriaTarefa === 'casa' ? 'selected' : ''}" 
                 data-category="casa" onclick="selecionarCategoriaEdicao(this, ${idTarefa})">
                <span>🏠</span>
            </div>
            <div class="category-option ${categoriaTarefa === 'trabalho' ? 'selected' : ''}" 
                 data-category="trabalho" onclick="selecionarCategoriaEdicao(this, ${idTarefa})">
                <span>💼</span>
            </div>
            <div class="category-option ${categoriaTarefa === 'estudo' ? 'selected' : ''}" 
                 data-category="estudo" onclick="selecionarCategoriaEdicao(this, ${idTarefa})">
                <span>📚</span>
            </div>
        </div>
    `;
    
    divTarefa.classList.add('editing');
    
    divTarefa.innerHTML = `
        <input type="text" class="edit-nome" value="${nomeTarefa}" placeholder="Nome da tarefa">
        <input type="date" class="edit-data" value="${dataISO}">
        ${opcoesCategoria}
        <input type="hidden" class="edit-categoria" value="${categoriaTarefa}">
        <div class="edit-actions">
            <button onclick="salvarEdicao(${idTarefa})">✅</button>
            <button onclick="cancelarEdicao(${idTarefa})">❌</button>
        </div>
    `;
    
    divTarefa.draggable = false;
    divTarefa.querySelector('.edit-nome').focus();
}

function selecionarCategoriaEdicao(elemento, idTarefa) {
    const divTarefa = document.querySelector(`.task[data-id="${idTarefa}"]`);
    
    divTarefa.querySelectorAll('.category-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    elemento.classList.add('selected');
    divTarefa.querySelector('.edit-categoria').value = elemento.dataset.category;
}

async function salvarEdicao(idTarefa) 
{
    let divTarefa = document.querySelector(`.task[data-id="${idTarefa}"]`);
    
    let novoNome = divTarefa.querySelector('.edit-nome').value.trim();
    let novaData = divTarefa.querySelector('.edit-data').value;
    let novaCategoria = divTarefa.querySelector('.edit-categoria').value;
    
    if (novoNome === "") 
    {
        alert("O nome da tarefa não pode estar vazio!");
        return;
    }
    
    divTarefa.classList.add('saving');
    
    try {
        const resposta = await fetch(`http://127.0.0.1:5000/task-manager/${idTarefa}`, 
        {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nome: novoNome,
                data: novaData || null,
                categoria: novaCategoria
            })
        });
        
        if (resposta.ok) 
        {
            const tarefaAtualizada = await resposta.json();
            
            divTarefa.classList.remove('editing', 'saving');
            divTarefa.draggable = true;
            divTarefa.dataset.nome = tarefaAtualizada.nome;
            divTarefa.dataset.data = tarefaAtualizada.data;
            divTarefa.dataset.categoria = tarefaAtualizada.categoria || "";
            
            let iconeCategoria = "";
            switch(tarefaAtualizada.categoria) {
                case "casa":
                    iconeCategoria = "🏠";
                    break;
                case "trabalho":
                    iconeCategoria = "💼";
                    break;
                case "estudo":
                    iconeCategoria = "📚";
                    break;
                default:
                    iconeCategoria = "";
            }
            
            divTarefa.innerHTML = 
            `
                <p>${iconeCategoria ? `<span class="task-category-icon">${iconeCategoria}</span>` : ''}<strong>${tarefaAtualizada.nome}</strong></p>
                <p>${tarefaAtualizada.data}</p>
                <div class="task-actions">
                    <button onclick="editarTarefa(this)">✏️</button>
                    <button onclick="excluirTarefa(this)">❌</button>
                </div>
            `;
            
            divTarefa.classList.add('updated');
            setTimeout(() => 
            {
                divTarefa.classList.remove('updated');
            }, 1000);
        } 
        else 
        {
            throw new Error("Falha ao atualizar tarefa");
        }
    } 
    catch (erro) 
    {
        console.error("Erro ao salvar tarefa:", erro);
        
        divTarefa.classList.remove('saving');
        
        alert("Erro ao salvar a tarefa. Tente novamente.");
    }
}

function cancelarEdicao(idTarefa) 
{
    let divTarefa = document.querySelector(`.task[data-id="${idTarefa}"]`);
    
    if (divTarefa.dataset.originalContent) 
    {
        divTarefa.innerHTML = divTarefa.dataset.originalContent;
    } 
    else 
    {
        carregarTarefas();
    }
    
    divTarefa.classList.remove('editing');
    divTarefa.draggable = true;
}

document.addEventListener("DOMContentLoaded", function() 
{
    document.querySelectorAll('.task-column').forEach(column => 
    {
        column.addEventListener('dragenter', permitirSoltar);
        column.addEventListener('dragleave', arrastarSaindo);
    });
    
    document.querySelectorAll('.task-list').forEach(list => 
    {
        list.addEventListener('dragenter', permitirSoltar);
        list.addEventListener('dragleave', arrastarSaindo);
    });
});