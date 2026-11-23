param([string]$Workbook = 'C:\Users\Admin\Downloads\MPSEC_UpdatedVersion 22nd Oct (1).xlsx')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
$stream = [IO.File]::Open($Workbook, 'Open', 'Read', 'ReadWrite')
$zip = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Read)
function Read-Xml($name) {
  $reader = [IO.StreamReader]::new($zip.GetEntry($name).Open())
  try { return [xml]$reader.ReadToEnd() } finally { $reader.Dispose() }
}
try {
  $strings = @( (Read-Xml 'xl/sharedStrings.xml').sst.si | ForEach-Object { $_.InnerText } )
  $styles = (Read-Xml 'xl/styles.xml').styleSheet
  $formats = @{}
  foreach ($format in $styles.numFmts.numFmt) { $formats[[int]$format.numFmtId] = [string]$format.formatCode }
  $rels = @{}
  foreach ($rel in (Read-Xml 'xl/_rels/workbook.xml.rels').Relationships.Relationship) { $rels[$rel.Id] = $rel.Target }
  $groups = @{}
  foreach ($sheet in (Read-Xml 'xl/workbook.xml').workbook.sheets.sheet) {
    $name = [string]$sheet.name
    $group = switch -Regex ($name) {
      '^GDP$' {'gdp'; break}
      '^I\.' {'i'; break}
      '^II-' {'ii'; break}
      '^III-' {'iii'; break}
      '^IV\.' {'iv'; break}
      '^V\.' {'v'; break}
      '^(VI-|VII\.|VIII$)' {'vi-viii'; break}
      '^(IX$|X\.|XI-|XII\.|XIII\.|XIV-|XVII\.)' {'ix-xvii'; break}
      default {$null}
    }
    if (!$group) { continue }
    $id = $sheet.GetAttribute('id', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
    $target = [string]$rels[$id]
    if ($target.StartsWith('/')) { $target = $target.TrimStart('/') } else { $target = 'xl/' + $target }
    $xml = (Read-Xml $target).worksheet
    $cells = @(
      foreach ($row in $xml.sheetData.row) {
        foreach ($cell in $row.c) {
          $type = $cell.GetAttribute('t')
          $value = [string]$cell.SelectSingleNode('*[local-name()="v"]').InnerText
          if ($type -eq 's') { $value = $strings[[int]$value] }
          if ($type -eq 'inlineStr') { $value = $cell.is.InnerText; $type = 's' }
          $style = [int]$cell.GetAttribute('s')
          $formatId = [int]$styles.cellXfs.xf[$style].numFmtId
          [ordered]@{ref=$cell.GetAttribute('r'); row=[int]$row.r; value=[string]$value; type=$type;
            formula=[string]$cell.SelectSingleNode('*[local-name()="f"]').InnerText;
            hasFormula=($null -ne $cell.SelectSingleNode('*[local-name()="f"]'));
            hidden=($row.hidden -eq '1'); style=$style; formatId=$formatId; format=[string]$formats[$formatId]}
        }
      }
    )
    if (!$groups.ContainsKey($group)) { $groups[$group] = @() }
    $groups[$group] += [ordered]@{sheet=$name; dimension=[string]$xml.dimension.ref;
      hiddenRows=@($xml.sheetData.row | Where-Object hidden -eq '1' | ForEach-Object {[int]$_.r});
      mergedRanges=@($xml.mergeCells.mergeCell | ForEach-Object {[string]$_.ref}); cells=$cells}
    Write-Output "$name : $($cells.Count) cells"
  }
  foreach ($group in $groups.Keys) {
    $file = Join-Path $env:TEMP "energy-section-$group-audit.json"
    ConvertTo-Json -InputObject @($groups[$group]) -Depth 12 | Set-Content -LiteralPath $file -Encoding UTF8
  }
} finally { $zip.Dispose(); $stream.Dispose() }
