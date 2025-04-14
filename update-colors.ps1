# PowerShell script to update color classes
$files = Get-ChildItem -Path "src" -Recurse -Include "*.tsx","*.ts","*.jsx","*.js"

foreach ($file in $files) {
    (Get-Content $file.FullName) | 
        ForEach-Object {
            $_ -replace 'bg-indigo-([0-9]{2,3})', 'bg-primary-$1' `
               -replace 'text-indigo-([0-9]{2,3})', 'text-primary-$1' `
               -replace 'border-indigo-([0-9]{2,3})', 'border-primary-$1' `
               -replace 'ring-indigo-([0-9]{2,3})', 'ring-primary-$1' `
               -replace 'hover:bg-indigo-([0-9]{2,3})', 'hover:bg-primary-$1' `
               -replace 'hover:text-indigo-([0-9]{2,3})', 'hover:text-primary-$1' `
               -replace 'focus:border-indigo-([0-9]{2,3})', 'focus:border-primary-$1' `
               -replace 'focus:ring-indigo-([0-9]{2,3})', 'focus:ring-primary-$1'
        } | Set-Content $file.FullName
} 