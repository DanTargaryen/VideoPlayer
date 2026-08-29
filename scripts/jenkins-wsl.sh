#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
LOCAL_CI_DIR=${LOCAL_CI_DIR:-"$ROOT_DIR/.ci-local"}
BIN_DIR="$LOCAL_CI_DIR/bin"
NODE_VERSION=${NODE_VERSION:-22.22.2}
KIND_VERSION=${KIND_VERSION:-v0.32.0}
KUBECTL_VERSION=${KUBECTL_VERSION:-stable}
JAVA_DOWNLOAD_URL=${JAVA_DOWNLOAD_URL:-https://download.oracle.com/java/21/latest/jdk-21_linux-x64_bin.tar.gz}
JENKINS_PORT=${JENKINS_PORT:-8081}
JENKINS_HOME=${JENKINS_HOME:-"$LOCAL_CI_DIR/jenkins-home"}
JENKINS_WAR=${JENKINS_WAR:-"$LOCAL_CI_DIR/jenkins.war"}
JAVA_HOME_LOCAL=${JAVA_HOME_LOCAL:-"$LOCAL_CI_DIR/jdk-21"}
NODE_HOME_LOCAL=${NODE_HOME_LOCAL:-"$LOCAL_CI_DIR/node-v$NODE_VERSION-linux-x64"}

download() {
  local url=$1
  local target=$2
  mkdir -p "$(dirname "$target")"
  curl -fL --retry 5 --retry-delay 2 --connect-timeout 20 --max-time 600 "$url" -o "$target"
}

install_node() {
  if [[ -x "$NODE_HOME_LOCAL/bin/node" ]] && [[ "$($NODE_HOME_LOCAL/bin/node --version)" == "v$NODE_VERSION" ]]; then
    return
  fi

  local archive="$LOCAL_CI_DIR/node-v$NODE_VERSION-linux-x64.tar.xz"
  if [[ ! -s "$archive" ]]; then
    download "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.xz" "$archive"
  fi
  rm -rf "$NODE_HOME_LOCAL"
  mkdir -p "$LOCAL_CI_DIR/node-extract"
  tar -xJf "$archive" -C "$LOCAL_CI_DIR/node-extract"
  mv "$LOCAL_CI_DIR/node-extract/node-v$NODE_VERSION-linux-x64" "$NODE_HOME_LOCAL"
  rm -rf "$LOCAL_CI_DIR/node-extract"
}

install_java() {
  if [[ -x "$JAVA_HOME_LOCAL/bin/java" ]] && "$JAVA_HOME_LOCAL/bin/java" -version 2>&1 | grep -q 'version "21\.'; then
    return
  fi

  local archive="$LOCAL_CI_DIR/jdk-21-linux-x64.tar.gz"
  if [[ ! -s "$archive" ]]; then
    download "$JAVA_DOWNLOAD_URL" "$archive"
  fi
  rm -rf "$JAVA_HOME_LOCAL"
  mkdir -p "$JAVA_HOME_LOCAL"
  tar -xzf "$archive" --strip-components=1 -C "$JAVA_HOME_LOCAL"
}

install_kind() {
  if command -v kind.exe >/dev/null 2>&1; then
    printf '#!/usr/bin/env bash\nexec kind.exe "$@"\n' > "$BIN_DIR/kind"
    chmod +x "$BIN_DIR/kind"
    return
  fi
  if [[ -x "$BIN_DIR/kind" ]] && "$BIN_DIR/kind" version | grep -q "$KIND_VERSION"; then
    return
  fi
  download "https://kind.sigs.k8s.io/dl/$KIND_VERSION/kind-linux-amd64" "$BIN_DIR/kind"
  chmod +x "$BIN_DIR/kind"
}

install_kubectl() {
  if command -v kubectl.exe >/dev/null 2>&1; then
    if [[ ! -x "$BIN_DIR/kubectl" ]]; then
      printf '#!/usr/bin/env bash\nexec kubectl.exe "$@"\n' > "$BIN_DIR/kubectl"
      chmod +x "$BIN_DIR/kubectl"
    fi
    return
  fi
  local version="$KUBECTL_VERSION"
  if [[ "$version" == stable ]]; then
    version=$(curl -fsSL --retry 5 --retry-delay 2 https://dl.k8s.io/release/stable.txt)
  fi
  if [[ -x "$BIN_DIR/kubectl" ]] && "$BIN_DIR/kubectl" version --client=true --output=json 2>/dev/null | grep -q "\"gitVersion\":\"$version\""; then
    return
  fi
  download "https://dl.k8s.io/release/$version/bin/linux/amd64/kubectl" "$BIN_DIR/kubectl"
  chmod +x "$BIN_DIR/kubectl"
}

install_jenkins() {
  if [[ -s "$JENKINS_WAR" ]]; then
    return
  fi
  download "https://get.jenkins.io/war-stable/latest/jenkins.war" "$JENKINS_WAR"
}

setup() {
  mkdir -p "$BIN_DIR" "$JENKINS_HOME"
  install_node
  install_java
  install_kind
  install_kubectl
  install_jenkins

  printf 'Node:     '
  "$NODE_HOME_LOCAL/bin/node" --version
  printf 'npm:      '
  "$NODE_HOME_LOCAL/bin/npm" --version
  printf 'Java:     '
  "$JAVA_HOME_LOCAL/bin/java" -version 2>&1 | sed -n '1p'
  printf 'Kind:     '
  timeout 5 "$BIN_DIR/kind" version || printf 'unavailable from this WSL session\n'
  printf 'kubectl:  '
  timeout 5 "$BIN_DIR/kubectl" version --client=true --output=yaml 2>/dev/null \
    | sed -n 's/^gitVersion: //p' | head -n 1 \
    || printf 'unavailable from this WSL session\n'
  printf 'Jenkins:  %s\n' "$JENKINS_WAR"

  if ! docker info >/dev/null 2>&1; then
    cat >&2 <<'EOF'
Docker daemon is not available from this WSL distribution.
Open Docker Desktop > Settings > Resources > WSL Integration, enable Ubuntu,
click Apply, and make sure Docker Desktop is running before starting the job.
EOF
  fi
}

start() {
  setup
  export PATH="$BIN_DIR:$NODE_HOME_LOCAL/bin:$PATH"
  export JAVA_HOME="$JAVA_HOME_LOCAL"
  export JENKINS_HOME
  printf 'Jenkins URL: http://127.0.0.1:%s\n' "$JENKINS_PORT"
  printf 'Stop with Ctrl-C.\n'
  exec "$JAVA_HOME/bin/java" -jar "$JENKINS_WAR" --httpListenAddress=127.0.0.1 --httpPort="$JENKINS_PORT"
}

case "${1:-setup}" in
  setup)
    setup
    ;;
  start)
    start
    ;;
  *)
    echo "Usage: $0 {setup|start}" >&2
    exit 2
    ;;
esac
