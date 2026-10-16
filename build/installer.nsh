; Allow phones on the same private network to reach Whoosh's local upload server.
!macro customInstall
  nsExec::Exec 'netsh advfirewall firewall delete rule name="Whoosh"'
  nsExec::Exec 'netsh advfirewall firewall add rule name="Whoosh" dir=in action=allow program="$INSTDIR\${APP_EXECUTABLE_FILENAME}" enable=yes profile=private'
!macroend

!macro customUnInstall
  nsExec::Exec 'netsh advfirewall firewall delete rule name="Whoosh"'
!macroend
