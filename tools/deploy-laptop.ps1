# Updates the backend on the printer laptop from this PC (you type the laptop's sudo password):
#   powershell -ExecutionPolicy Bypass -File tools\deploy-laptop.ps1 [-Branch main] [-Force]
# -Branch switches the laptop to that branch; -Force runs even during a print.
# Push your changes first: the laptop pulls from GitHub.

param([string]$Branch, [switch]$Force)

$remote = 'sudo /usr/local/lib/printos/update.sh'
if ($Branch) {
    if ($Branch -notmatch '^[A-Za-z0-9._][A-Za-z0-9._/-]*$') { throw "Not a branch name: $Branch" }
    $remote += " --branch $Branch"
}
if ($Force) { $remote += ' --force' }
ssh -t klipper $remote
exit $LASTEXITCODE
