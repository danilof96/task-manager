from flask import Flask, request, jsonify, render_template, session, redirect, url_for
import psycopg2
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import os

app = Flask(__name__)
CORS(app, supports_credentials=True)

app.secret_key = 'ABC123'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

DB_NOME = "task_manager"
DB_USUARIO = "faculdade_login"
DB_SENHA = "abc123"
DB_SERVIDOR = "localhost"
DB_PORTA = "3306"

def obter_conexao_bd():
    try:
        conexao = psycopg2.connect(
            dbname=DB_NOME,
            user=DB_USUARIO,
            password=DB_SENHA,
            host=DB_SERVIDOR,
            port=DB_PORTA
        )
        return conexao
    except psycopg2.Error as e:
        raise

def init_db():
    conexao = obter_conexao_bd()
    cursor = conexao.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id SERIAL PRIMARY KEY,
            nome VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            senha_hash VARCHAR(255) NOT NULL,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tarefas (
            id SERIAL PRIMARY KEY,
            nome VARCHAR(255) NOT NULL,
            data DATE,
            status VARCHAR(50) DEFAULT 'todo',
            categoria VARCHAR(100)
        )
    """)
    
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='tarefas' AND column_name='user_id'
    """)
    
    if not cursor.fetchone():
        cursor.execute("""
            ALTER TABLE tarefas 
            ADD COLUMN user_id INTEGER REFERENCES usuarios(id)
        """)
    
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='tarefas' AND column_name='criado_em'
    """)
    
    if not cursor.fetchone():
        cursor.execute("""
            ALTER TABLE tarefas 
            ADD COLUMN criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        """)
        
        cursor.execute("""
            UPDATE tarefas 
            SET criado_em = CURRENT_TIMESTAMP 
            WHERE criado_em IS NULL
        """)
    
    conexao.commit()
    cursor.close()
    conexao.close()

@app.route("/api/session-status")
def session_status():
    return jsonify({
        "authenticated": 'user_id' in session,
        "user_id": session.get('user_id'),
        "user_name": session.get('user_name')
    })

@app.route("/")
def inicio():
    if 'user_id' in session:
        return render_template('index.html')
    return render_template('login.html')

@app.route("/login")
def login_page():
    return render_template('login.html')

@app.route("/dashboard")
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    return render_template('index.html')

@app.route("/api/login", methods=["POST"])
def fazer_login():
    try:
        dados = request.json
        if not dados:
            return jsonify({"erro": "Dados não fornecidos"}), 400
            
        email = dados.get("email")
        senha = dados.get("password")
        
        if not email or not senha:
            return jsonify({"erro": "Email e senha são obrigatórios"}), 400
        
        conexao = obter_conexao_bd()
        cursor = conexao.cursor()
        
        cursor.execute("SELECT id, nome, senha_hash FROM usuarios WHERE email = %s", (email,))
        usuario = cursor.fetchone()
        
        cursor.close()
        conexao.close()
        
        if usuario and check_password_hash(usuario[2], senha):
            session['user_id'] = usuario[0]
            session['user_name'] = usuario[1]
            return jsonify({
                "sucesso": True,
                "mensagem": "Login realizado com sucesso!",
                "usuario": {"id": usuario[0], "nome": usuario[1]}
            })
        else:
            return jsonify({"erro": "Email ou senha incorretos"}), 401
            
    except Exception as e:
        return jsonify({"erro": "Erro interno do servidor"}), 500

@app.route("/api/register", methods=["POST"])
def fazer_registro():
    try:
        dados = request.json
        if not dados:
            return jsonify({"erro": "Dados não fornecidos"}), 400
            
        nome = dados.get("name")
        email = dados.get("email")
        senha = dados.get("password")
        
        if not nome or not email or not senha:
            return jsonify({"erro": "Todos os campos são obrigatórios"}), 400
        
        if len(senha) < 6:
            return jsonify({"erro": "A senha deve ter pelo menos 6 caracteres"}), 400
        
        conexao = obter_conexao_bd()
        cursor = conexao.cursor()
        
        cursor.execute("SELECT id FROM usuarios WHERE email = %s", (email,))
        if cursor.fetchone():
            cursor.close()
            conexao.close()
            return jsonify({"erro": "Este email já está cadastrado"}), 400
        
        senha_hash = generate_password_hash(senha)
        
        cursor.execute(
            "INSERT INTO usuarios (nome, email, senha_hash) VALUES (%s, %s, %s) RETURNING id",
            (nome, email, senha_hash)
        )
        user_id = cursor.fetchone()[0]
        conexao.commit()
        
        cursor.close()
        conexao.close()
        
        return jsonify({
            "sucesso": True,
            "mensagem": "Usuário cadastrado com sucesso!",
            "usuario": {"id": user_id, "nome": nome}
        })
        
    except psycopg2.IntegrityError as e:
        return jsonify({"erro": "Email já está cadastrado"}), 400
    except Exception as e:
        return jsonify({"erro": "Erro interno do servidor"}), 500

@app.route("/api/logout", methods=["POST"])
def fazer_logout():
    session.clear()
    return jsonify({"sucesso": True, "mensagem": "Logout realizado com sucesso!"})

@app.route("/task-manager", methods=["GET"])
def listar_tarefas():
    try:
        if 'user_id' not in session:
            return jsonify({"erro": "Usuário não autenticado"}), 401
        
        user_id = session['user_id']
        
        conexao = obter_conexao_bd()
        cursor = conexao.cursor()
        
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='tarefas' AND column_name='criado_em'
        """)
        tem_criado_em = cursor.fetchone() is not None
        
        if tem_criado_em:
            sql = """
                SELECT 
                    id, 
                    nome, 
                    TO_CHAR(data, 'DD/MM/YYYY') as data_formatada, 
                    status,
                    categoria,
                    user_id
                FROM tarefas
                WHERE user_id = %s
                ORDER BY criado_em DESC
            """
        else:
            sql = """
                SELECT 
                    id, 
                    nome, 
                    TO_CHAR(data, 'DD/MM/YYYY') as data_formatada, 
                    status,
                    categoria,
                    user_id
                FROM tarefas
                WHERE user_id = %s
                ORDER BY id DESC
            """
        
        cursor.execute(sql, (user_id,))
        tarefas = cursor.fetchall()
        
        lista_tarefas = []
        for t in tarefas:
            tarefa_dict = {
                "id": t[0],
                "nome": t[1],
                "data": t[2] if t[2] else "Sem data",
                "status": t[3],
                "categoria": t[4] if len(t) > 4 and t[4] else "",
                "user_id": t[5]
            }
            lista_tarefas.append(tarefa_dict)
        
        cursor.close()
        conexao.close()
        
        return jsonify(lista_tarefas)
        
    except Exception as e:
        return jsonify({"erro": "Erro interno do servidor"}), 500

@app.route("/task-manager", methods=["POST"])
def adicionar_tarefa():
    try:
        if 'user_id' not in session:
            return jsonify({"erro": "Usuário não autenticado"}), 401
        
        user_id = session['user_id']
        dados = request.json
        
        if not dados:
            return jsonify({"erro": "Dados não fornecidos"}), 400
        
        nome = dados.get("nome")
        data_tarefa = dados.get("data")
        status = dados.get("status", "todo")
        categoria = dados.get("categoria", "")

        if not nome:
            return jsonify({"erro": "Nome da tarefa é obrigatório"}), 400

        conexao = obter_conexao_bd()
        cursor = conexao.cursor()
        
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='tarefas' AND column_name='criado_em'
        """)
        tem_criado_em = cursor.fetchone() is not None
        
        if tem_criado_em:
            cursor.execute(
                "INSERT INTO tarefas (nome, data, status, categoria, user_id, criado_em) VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP) RETURNING id",
                (nome, data_tarefa, status, categoria, user_id)
            )
        else:
            cursor.execute(
                "INSERT INTO tarefas (nome, data, status, categoria, user_id) VALUES (%s, %s, %s, %s, %s) RETURNING id",
                (nome, data_tarefa, status, categoria, user_id)
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
            "data": data_formatada if data_formatada else "Sem data",
            "status": status,
            "categoria": categoria
        })
        
    except Exception as e:
        return jsonify({"erro": "Erro interno do servidor"}), 500

@app.route("/task-manager/<int:task_id>", methods=["DELETE"])
def excluir_tarefa(task_id):
    try:
        if 'user_id' not in session:
            return jsonify({"erro": "Usuário não autenticado"}), 401
        
        user_id = session['user_id']
        
        conexao = obter_conexao_bd()
        cursor = conexao.cursor()
        
        cursor.execute("SELECT nome FROM tarefas WHERE id = %s AND user_id = %s", (task_id, user_id))
        tarefa = cursor.fetchone()
        
        if not tarefa:
            cursor.close()
            conexao.close()
            return jsonify({"erro": "Tarefa não encontrada"}), 404
        
        cursor.execute("DELETE FROM tarefas WHERE id = %s AND user_id = %s", (task_id, user_id))
        conexao.commit()
        cursor.close()
        conexao.close()

        return jsonify({"mensagem": "Tarefa excluída!"})
        
    except Exception as e:
        return jsonify({"erro": "Erro interno do servidor"}), 500

@app.route("/task-manager/<int:task_id>", methods=["PUT"])
def editar_tarefa(task_id):
    try:
        if 'user_id' not in session:
            return jsonify({"erro": "Usuário não autenticado"}), 401
        
        user_id = session['user_id']
        dados = request.json
        
        if not dados:
            return jsonify({"erro": "Dados não fornecidos"}), 400
        
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
        
        sql = f"UPDATE tarefas SET {', '.join(atualizacoes)} WHERE id = %s AND user_id = %s RETURNING id, nome, TO_CHAR(data, 'DD/MM/YYYY') as data_formatada, status, categoria"
        parametros.extend([task_id, user_id])
        
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
            "data": resultado[2] if resultado[2] else "Sem data",
            "status": resultado[3],
            "categoria": resultado[4] if len(resultado) > 4 and resultado[4] else ""
        }
        
        cursor.close()
        conexao.close()
        
        return jsonify(tarefa_atualizada)
        
    except Exception as e:
        return jsonify({"erro": "Erro interno do servidor"}), 500

@app.route("/task-manager/<int:task_id>", methods=["PATCH"])
def atualizar_status_tarefa(task_id):
    try:
        if 'user_id' not in session:
            return jsonify({"erro": "Usuário não autenticado"}), 401
        
        user_id = session['user_id']
        dados = request.json
        
        if not dados:
            return jsonify({"erro": "Dados não fornecidos"}), 400
        
        novo_status = dados.get("status")

        if novo_status not in ["todo", "inProgress", "done"]:
            return jsonify({"erro": "Status inválido"}), 400

        conexao = obter_conexao_bd()
        cursor = conexao.cursor()
        
        cursor.execute("SELECT nome FROM tarefas WHERE id = %s AND user_id = %s", (task_id, user_id))
        tarefa = cursor.fetchone()
        
        if not tarefa:
            cursor.close()
            conexao.close()
            return jsonify({"erro": "Tarefa não encontrada"}), 404
        
        cursor.execute("UPDATE tarefas SET status = %s WHERE id = %s AND user_id = %s", (novo_status, task_id, user_id))
        conexao.commit()
        cursor.close()
        conexao.close()

        return jsonify({"mensagem": "Status atualizado com sucesso!"})
        
    except Exception as e:
        return jsonify({"erro": "Erro interno do servidor"}), 500

if __name__ == "__main__":
    try:
        init_db()
        app.run(debug=True)
    except Exception as e:
        pass