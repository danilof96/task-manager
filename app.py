from flask import Flask, request, jsonify
import psycopg2
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)

DB_NOME = "task_manager"
DB_USUARIO = "danilo_admin"
DB_SENHA = "asenhae1102"
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

@app.route("/tasks", methods=["GET"])
def listar_tarefas():
    conexao = obter_conexao_bd()
    cursor = conexao.cursor()
    
    cursor.execute("""
        SELECT 
            id, 
            nome, 
            TO_CHAR(data, 'DD/MM/YYYY') as data_formatada, 
            status 
        FROM tarefas
    """)
    
    tarefas = cursor.fetchall()
    
    lista_tarefas = []
    for t in tarefas:
        tarefa_dict = {
            "id": t[0],
            "nome": t[1],
            "data": t[2],  # Já formatada pelo SQL
            "status": t[3]
        }
        lista_tarefas.append(tarefa_dict)
    
    cursor.close()
    conexao.close()
    return jsonify(lista_tarefas)

@app.route("/tasks", methods=["POST"])
def adicionar_tarefa():
    dados = request.json
    nome = dados["nome"]
    data_tarefa = dados["data"]
    status = dados.get("status", "todo")

    conexao = obter_conexao_bd()
    cursor = conexao.cursor()
    cursor.execute(
        "INSERT INTO tarefas (nome, data, status) VALUES (%s, %s, %s) RETURNING id",
        (nome, data_tarefa, status)
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
        "status": status
    })

@app.route("/tasks/<int:task_id>", methods=["DELETE"])
def excluir_tarefa(task_id):
    conexao = obter_conexao_bd()
    cursor = conexao.cursor()
    cursor.execute("DELETE FROM tarefas WHERE id = %s", (task_id,))
    conexao.commit()
    cursor.close()
    conexao.close()

    return jsonify({"mensagem": "Tarefa excluída!"})

@app.route("/tasks/<int:task_id>", methods=["PATCH"])
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