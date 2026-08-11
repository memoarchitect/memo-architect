"""Small, dependency-free SysML v2 formatter for MkDocs code fences.

Pygments does not currently ship a SysML lexer.  This formatter gives the
documentation a stable, readable SysML treatment without pretending to parse
or validate the language.
"""

from html import escape
import re


_TOKEN = re.compile(
    r'(//[^\n]*|"(?:\\.|[^"\\])*"|\b(?:package|private|public|import|part|item|requirement|connection|connect|to|attribute|def|abstract|specializes)\b|\b(?:Actor|StakeholderNeed|SystemRequirement|OperationalActivity|OperationalScenario|LogicalFunction|SoftwareElement|HardwareAssembly|Hazard|RiskControlMeasure|VerificationCase)\b|\b(?:DerivesFrom|SequencesStep|SatisfiedBy|AllocatedTo|MitigatesHazard|VerifiedBy|ProducesEvidence)\b|::>|:>>|\b\d+(?:\.\d+)?\b)'
)


def _class_for(token):
    if token.startswith('//'):
        return 'sysml-comment'
    if token.startswith('"'):
        return 'sysml-string'
    if token in {'Actor', 'StakeholderNeed', 'SystemRequirement', 'OperationalActivity', 'OperationalScenario', 'LogicalFunction', 'SoftwareElement', 'HardwareAssembly', 'Hazard', 'RiskControlMeasure', 'VerificationCase'}:
        return 'sysml-type'
    if token in {'DerivesFrom', 'SequencesStep', 'SatisfiedBy', 'AllocatedTo', 'MitigatesHazard', 'VerifiedBy', 'ProducesEvidence'}:
        return 'sysml-relation'
    if token in {'::>', ':>>'}:
        return 'sysml-operator'
    if token[0].isdigit():
        return 'sysml-number'
    return 'sysml-keyword'


def sysml_fence_format(source, language, class_name, options, md, **kwargs):
    """Render a ``sysml`` fence with the token classes above."""
    parts = []
    last = 0
    for match in _TOKEN.finditer(source):
        parts.append(escape(source[last:match.start()]))
        token = match.group(0)
        parts.append(f'<span class="{_class_for(token)}">{escape(token)}</span>')
        last = match.end()
    parts.append(escape(source[last:]))
    return '<div class="highlight sysml-highlight"><pre><code class="language-sysml">{}</code></pre></div>'.format(''.join(parts))
