# Sistema de Saneamento - Controle de Estoque

## 📋 Descrição

Sistema web para controle e monitoramento de estoques de materiais de saneamento, com integração entre os sistemas SIAGRI e CIGAM. Permite visualizar saldos, identificar divergências e acompanhar movimentações de estoque em tempo real.

## 🏗️ Arquitetura

### Backend (FastAPI)
- **Framework**: FastAPI 0.104+
- **Banco de Dados**: PostgreSQL 15+
- **Cache**: Redis 7+
- **ORM**: SQLAlchemy 2.0+
- **Validação**: Pydantic v2
- **Documentação**: Swagger UI automática

### Frontend (Next.js)
- **Framework**: Next.js 14+ (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **Estado**: TanStack Query (React Query)
- **Tabelas**: TanStack Table
- **Formulários**: React Hook Form + Zod
- **Ícones**: Lucide React

### Infraestrutura
- **Containerização**: Docker + Docker Compose
- **Proxy Reverso**: Nginx
- **Monitoramento**: Adminer (DB) + Redis Commander

## 🚀 Funcionalidades

### ✅ Implementadas
- [x] Filtros avançados por empresa, grupo, subgrupo e produto
- [x] Visualização de saldos consolidados (SIAGRI vs CIGAM)
- [x] Identificação automática de divergências
- [x] Tabela responsiva com paginação e ordenação
- [x] Modal de detalhes do material
- [x] Histórico de movimentações
- [x] Exportação para CSV
- [x] Cache Redis para performance
- [x] API RESTful documentada
- [x] Interface responsiva e moderna

### 🔄 Em Desenvolvimento
- [ ] Autenticação e autorização
- [ ] Relatórios avançados
- [ ] Notificações de divergências
- [ ] Dashboard executivo
- [ ] Integração com sistemas externos

## 📁 Estrutura do Projeto

```
app-saneamento/
├── backend/                 # API FastAPI
│   ├── app/
│   │   ├── api/            # Endpoints da API
│   │   ├── core/           # Configurações e segurança
│   │   ├── models/         # Modelos SQLAlchemy
│   │   ├── schemas/        # Schemas Pydantic
│   │   ├── services/       # Lógica de negócio
│   │   └── main.py         # Aplicação principal
│   ├── requirements.txt    # Dependências Python
│   └── Dockerfile.dev      # Container de desenvolvimento
├── frontend/               # Aplicação Next.js
│   ├── app/               # App Router (Next.js 14)
│   │   ├── components/    # Componentes React
│   │   ├── lib/          # Utilitários e configurações
│   │   ├── results/      # Página de resultados
│   │   └── page.tsx      # Página inicial (filtros)
│   ├── components/        # Componentes shadcn/ui
│   ├── package.json      # Dependências Node.js
│   └── Dockerfile.dev    # Container de desenvolvimento
├── database/
│   └── init/             # Scripts de inicialização
│       ├── 01-init.sql   # Estrutura do banco
│       └── 02-sample-data.sql # Dados de exemplo
├── nginx/                # Configuração Nginx
│   ├── nginx.conf        # Configuração principal
│   └── conf.d/
│       └── default.conf  # Configuração do servidor
├── docker-compose.yml    # Orquestração dos serviços
├── .env.example         # Variáveis de ambiente
└── README.md           # Este arquivo
```

## 🛠️ Instalação e Configuração

### Pré-requisitos
- Docker 24.0+
- Docker Compose 2.20+
- Git

### 1. Clone o Repositório
```bash
git clone <repository-url>
cd app-saneamento
```

### 2. Configure as Variáveis de Ambiente
```bash
cp .env.example .env
# Edite o arquivo .env conforme necessário
```

### 3. Inicie os Serviços
```bash
# Desenvolvimento
docker-compose up -d

# Ou para ver os logs
docker-compose up
```

### 4. Acesse a Aplicação
- **Frontend**: http://localhost:8877
- **API**: http://localhost:7700
- **Documentação API**: http://localhost:7700/docs
- **Adminer**: http://localhost:8080
- **Redis Commander**: http://localhost:8081

## 🔧 Desenvolvimento

### Backend (FastAPI)

#### Estrutura da API
```
GET  /api/v1/empresas          # Listar empresas
GET  /api/v1/grupos            # Listar grupos
GET  /api/v1/subgrupos         # Listar subgrupos
GET  /api/v1/produtos          # Listar produtos
GET  /api/v1/saldos            # Saldos consolidados
GET  /api/v1/materiais/{id}    # Detalhes do material
GET  /api/v1/movimentacoes     # Histórico de movimentações
```

#### Executar Localmente
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 7700
```

#### Testes
```bash
cd backend
pytest tests/ -v
```

### Frontend (Next.js)

#### Componentes Principais
- `FiltersForm`: Formulário de filtros da homepage
- `ResultsContent`: Tabela de resultados com TanStack Table
- `MaterialModal`: Modal de detalhes do material
- `MovementHistory`: Histórico de movimentações

#### Executar Localmente
```bash
cd frontend
npm install
npm run dev
```

#### Testes
```bash
cd frontend
npm run test
```

### Banco de Dados

#### Schema Principal
- `empresas`: Cadastro de empresas
- `grupos`: Grupos de materiais
- `subgrupos`: Subgrupos de materiais
- `produtos`: Cadastro de produtos/materiais
- `saldos_siagri`: Saldos do sistema SIAGRI
- `saldos_cigam`: Saldos do sistema CIGAM
- `historico_movimentacoes`: Log de movimentações

#### Views
- `v_saldos_consolidados`: Saldos consolidados com divergências
- `v_produtos_completos`: Produtos com informações completas

#### Conectar ao Banco
```bash
# Via Docker
docker-compose exec db psql -U saneamento_user -d saneamento_db

# Via Adminer
# Acesse http://localhost:8080
# Sistema: PostgreSQL
# Servidor: db
# Usuário: saneamento_user
# Senha: saneamento_pass
# Base de dados: saneamento_db
```

## 📊 Monitoramento

### Logs
```bash
# Todos os serviços
docker-compose logs -f

# Serviço específico
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Métricas
- **API**: Métricas automáticas via FastAPI
- **Cache**: Redis Commander para monitorar cache
- **Banco**: Adminer para consultas e monitoramento

## 🔒 Segurança

### Configurações de Produção
1. Altere todas as senhas padrão
2. Configure HTTPS no Nginx
3. Implemente autenticação JWT
4. Configure rate limiting
5. Ative logs de auditoria

### Variáveis Sensíveis
```bash
# Nunca commite estas variáveis
SECRET_KEY=<chave-super-secreta>
DATABASE_PASSWORD=<senha-forte>
REDIS_PASSWORD=<senha-redis>
```

## 🚀 Deploy

### Desenvolvimento
```bash
docker-compose up -d
```

### Produção
```bash
# Usar Docker Swarm ou Kubernetes
docker stack deploy -c docker-compose.prod.yml saneamento
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para suporte técnico:
- 📧 Email: suporte@saneamento.local
- 📱 Telefone: (11) 9999-9999
- 🐛 Issues: [GitHub Issues](https://github.com/seu-usuario/app-saneamento/issues)

## 📈 Roadmap

### v1.1 (Próxima Release)
- [ ] Autenticação e autorização
- [ ] Dashboard executivo
- [ ] Relatórios em PDF
- [ ] Notificações por email

### v1.2 (Futuro)
- [ ] App mobile (React Native)
- [ ] Integração com ERP
- [ ] BI e Analytics
- [ ] API GraphQL

---

**Desenvolvido com ❤️ para otimizar o controle de estoques de saneamento**