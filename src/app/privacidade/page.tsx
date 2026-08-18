export default function PrivacyPolicyPage() {
  return (
    <div className="prose prose-sm mx-auto w-full max-w-2xl space-y-4 text-sm text-body">
      <h1 className="text-2xl font-semibold tracking-tight text-strong">Política de Privacidade</h1>
      <p className="text-muted">Última atualização: 2026-08-17.</p>

      <h2 className="text-lg font-semibold text-strong">O que coletamos</h2>
      <p>
        Se você navega sem criar conta, não coletamos nenhum dado seu. Se você cria uma conta, guardamos apenas:
        seu email e senha (gerenciados pelo Supabase Auth), o nome e a foto que você escolher exibir, e o nome de
        usuário do seu perfil público.
      </p>

      <h2 className="text-lg font-semibold text-strong">Cookies e armazenamento local</h2>
      <p>
        Usamos um cookie/localStorage para manter sua sessão de login, e localStorage para lembrar sua preferência
        de tema (claro/escuro) e, se você optar, seu email e senha neste dispositivo (recurso "Lembrar minha
        senha" na tela de login). Não usamos cookies de rastreamento ou publicidade.
      </p>

      <h2 className="text-lg font-semibold text-strong">O que sua conta controla</h2>
      <p>
        Uma conta comum só gerencia sua própria lista de treinamentos (interesse/concluído) e seu perfil público —
        nunca o conteúdo do site em geral. Apenas contas de sysadmin, criadas exclusivamente pelos autores do
        site, podem editar a lista de treinamentos.
      </p>

      <h2 className="text-lg font-semibold text-strong">Compartilhamento</h2>
      <p>Não vendemos nem compartilhamos seus dados com terceiros. Não usamos ferramentas de analytics/rastreamento.</p>

      <h2 className="text-lg font-semibold text-strong">Exclusão de dados</h2>
      <p>
        Para excluir sua conta e seus dados, entre em contato com os autores do site (veja o rodapé) ou peça
        diretamente a um sysadmin.
      </p>
    </div>
  )
}
