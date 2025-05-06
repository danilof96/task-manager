from flask import Flask, request, jsonify
import psycopg2
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_NOME = "task_manager"
DB_USUARIO = "faculdade_login"
DB_SENHA = "abc123"
DB_SERVIDOR = "localhost"
DB_PORTA = "3306"

def obter_conexao_bd():
    return psycopg2.connect(
        dbname=DB_NOME,
        user=DB_USUARIO,
        password=DB_SENHA,
        host=DB_SERVIDOR,
        port=DB_PORTA
    )

@app.route("/")
def inicio():
    return jsonify({"mensagem": "API funcionando!"})

@app.route("/task-manager", methods=["GET"])
def listar_tarefas():
    conexao = obter_conexao_bd()
    cursor = conexao.cursor()
    
    cursor.execute("""
        SELECT 
            id, 
            nome, 
            TO_CHAR(data, 'DD/MM/YYYY') as data_formatada, 
            status,
            categoria
        FROM tarefas
    """)
    
    tarefas = cursor.fetchall()
    
    lista_tarefas = []
    for t in tarefas:
        tarefa_dict = {
            "id": t[0],
            "nome": t[1],
            "data": t[2],
            "status": t[3],
            "categoria": t[4] if len(t) > 4 else ""
        }
        lista_tarefas.append(tarefa_dict)
    
    cursor.close()
    conexao.close()
    return jsonify(lista_tarefas)

@app.route("/task-manager", methods=["POST"])
def adicionar_tarefa():
    dados = request.json
    nome = dados["nome"]
    data_tarefa = dados["data"]
    status = dados.get("status", "todo")
    categoria = dados.get("categoria", "")

    conexao = obter_conexao_bd()
    cursor = conexao.cursor()
    cursor.execute(
        "INSERT INTO tarefas (nome, data, status, categoria) VALUES (%s, %s, %s, %s) RETURNING id",
        (nome, data_tarefa, status, categoria)
    )
    id_tarefa = cursor.fetchone()[0]
    conexao.commit()
    
    cursor.execute(
        "SELECT TO_CHAR(data, 'DD/MM/YYYY') FROM tarefas WHERE id = %s",
        (id_tarefa,)
    )
    data_formatada = cursor.fetchone()[0]
    
    cursor.close()
    conexao.close()

    return jsonify({
        "id": id_tarefa, 
        "nome": nome, 
        "data": data_formatada,
        "status": status,
        "categoria": categoria
    })

@app.route("/task-manager/<int:task_id>", methods=["DELETE"])
def excluir_tarefa(task_id):
    conexao = obter_conexao_bd()
    cursor = conexao.cursor()
    cursor.execute("DELETE FROM tarefas WHERE id = %s", (task_id,))
    conexao.commit()
    cursor.close()
    conexao.close()

    return jsonify({"mensagem": "Tarefa excluída!"})

@app.route("/task-manager/<int:task_id>", methods=["PUT"])
def editar_tarefa(task_id):
    dados = request.json
    nome = dados.get("nome")
    data_tarefa = dados.get("data")
    status = dados.get("status")
    categoria = dados.get("categoria")
    
    atualizacoes = []
    parametros = []
    
    if nome is not None:
        atualizacoes.append("nome = %s")
        parametros.append(nome)
        
    if data_tarefa is not None:
        atualizacoes.append("data = %s")
        parametros.append(data_tarefa)
        
    if status is not None:
        if status not in ["todo", "inProgress", "done"]:
            return jsonify({"erro": "Status inválido"}), 400
        atualizacoes.append("status = %s")
        parametros.append(status)
    
    if categoria is not None:
        atualizacoes.append("categoria = %s")
        parametros.append(categoria)
    
    if not atualizacoes:
        return jsonify({"erro": "Nenhum campo para atualizar fornecido"}), 400
    
    sql = f"UPDATE tarefas SET {', '.join(atualizacoes)} WHERE id = %s RETURNING id, nome, TO_CHAR(data, 'DD/MM/YYYY') as data_formatada, status, categoria"
    parametros.append(task_id)
    
    conexao = obter_conexao_bd()
    cursor = conexao.cursor()
    cursor.execute(sql, parametros)
    
    resultado = cursor.fetchone()
    if not resultado:
        conexao.close()
        return jsonify({"erro": "Tarefa não encontrada"}), 404
    
    conexao.commit()
    
    tarefa_atualizada = {
        "id": resultado[0],
        "nome": resultado[1],
        "data": resultado[2],
        "status": resultado[3],
        "categoria": resultado[4] if len(resultado) > 4 else ""
    }
    
    cursor.close()
    conexao.close()
    
    return jsonify(tarefa_atualizada)

@app.route("/task-manager/<int:task_id>", methods=["PATCH"])
def atualizar_status_tarefa(task_id):
    dados = request.json
    novo_status = dados.get("status")

    if novo_status not in ["todo", "inProgress", "done"]:
        return jsonify({"erro": "Status inválido"}), 400

    conexao = obter_conexao_bd()
    cursor = conexao.cursor()
    cursor.execute("UPDATE tarefas SET status = %s WHERE id = %s", (novo_status, task_id))
    conexao.commit()
    cursor.close()
    conexao.close()

    return jsonify({"mensagem": "Status atualizado com sucesso!"})

if __name__ == "__main__":
    app.run(debug=True)
