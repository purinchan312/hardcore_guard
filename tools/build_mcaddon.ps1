#Requires -Version 5.1
<#
.SYNOPSIS
  Hardcore Guard Addon (BP + RP) のアセット・JSON・ES Module 検証および .mcaddon パッケージ生成スクリプト
#>

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BpDir = Join-Path $ProjectRoot "hardcore_guard_bp"
$RpDir = Join-Path $ProjectRoot "hardcore_guard_rp"
$OutputMcaddon = Join-Path $ProjectRoot "hardcore_guard.mcaddon"

Write-Host "=== [1/4] PNG アセットのバイナリヘッダ・解像度検証 ===" -ForegroundColor Cyan

function Test-PngHeader {
    param(
        [string]$FilePath,
        [int]$ExpectedWidth,
        [int]$ExpectedHeight
    )

    if (-not (Test-Path $FilePath)) {
        throw "PNG ファイルが見つかりません: $FilePath"
    }

    $bytes = [System.IO.File]::ReadAllBytes($FilePath)
    if ($bytes.Length -lt 33) {
        throw "PNG ファイルサイズが不正です: $FilePath"
    }

    # PNG シグネチャ確認: 89 50 4E 47 0D 0A 1A 0A
    $sig = @(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)
    for ($i = 0; $i -lt 8; $i++) {
        if ($bytes[$i] -ne $sig[$i]) {
            throw "PNG シグネチャが不正です: $FilePath"
        }
    }

    # IHDR 幅・高さ (Big-Endian offset 16..23)
    $width = ([int]$bytes[16] -shl 24) -bor ([int]$bytes[17] -shl 16) -bor ([int]$bytes[18] -shl 8) -bor [int]$bytes[19]
    $height = ([int]$bytes[20] -shl 24) -bor ([int]$bytes[21] -shl 16) -bor ([int]$bytes[22] -shl 8) -bor [int]$bytes[23]
    $bitDepth = [int]$bytes[24]
    $colorType = [int]$bytes[25] # 6 = RGBA

    if ($width -ne $ExpectedWidth -or $height -ne $ExpectedHeight) {
        throw "解像度不一致 ($FilePath): 期待=${ExpectedWidth}x${ExpectedHeight}, 実際=${width}x${height}"
    }
    if ($bitDepth -ne 8 -or $colorType -ne 6) {
        throw "カラーフォーマット不一致 ($FilePath): 32bit RGBA (depth=8, colorType=6) が必要ですが depth=$bitDepth, colorType=$colorType です"
    }

    Write-Host "  [OK] $(Split-Path $FilePath -Leaf) (${width}x${height} RGBA 32bit)" -ForegroundColor Green
}

Test-PngHeader -FilePath (Join-Path $BpDir "pack_icon.png") -ExpectedWidth 64 -ExpectedHeight 64
Test-PngHeader -FilePath (Join-Path $RpDir "pack_icon.png") -ExpectedWidth 64 -ExpectedHeight 64
Test-PngHeader -FilePath (Join-Path $RpDir "textures\items\op_terminal.png") -ExpectedWidth 16 -ExpectedHeight 16
Test-PngHeader -FilePath (Join-Path $RpDir "font\glyph_E1.png") -ExpectedWidth 256 -ExpectedHeight 256

Write-Host "=== [2/4] JSON ファイル構文検証 ===" -ForegroundColor Cyan

$jsonFiles = @(
    (Join-Path $BpDir "manifest.json"),
    (Join-Path $BpDir "items\op_terminal.json"),
    (Join-Path $RpDir "manifest.json"),
    (Join-Path $RpDir "textures\item_texture.json"),
    (Join-Path $RpDir "texts\languages.json")
)

foreach ($jf in $jsonFiles) {
    if (-not (Test-Path $jf)) {
        throw "必須 JSON ファイルが見つかりません: $jf"
    }
    $raw = Get-Content -Path $jf -Raw -Encoding UTF8
    $null = $raw | ConvertFrom-Json
    Write-Host "  [OK] $(Resolve-Path $jf -Relative)" -ForegroundColor Green
}

Write-Host "=== [3/4] ES Module (.js) import パス検証 ===" -ForegroundColor Cyan

$jsFiles = Get-ChildItem -Path (Join-Path $BpDir "scripts") -Filter "*.js" -Recurse
foreach ($jsFile in $jsFiles) {
    $content = Get-Content -Path $jsFile.FullName -Raw -Encoding UTF8
    $matches = [regex]::Matches($content, 'from\s+["'']([^"'']+)["'']')
    foreach ($m in $matches) {
        $importPath = $m.Groups[1].Value
        if ($importPath.StartsWith(".")) {
            if (-not $importPath.EndsWith(".js")) {
                throw "拡張子 .js が欠落している相対 import があります ($($jsFile.Name)): $importPath"
            }
            $resolvedTarget = Join-Path $jsFile.DirectoryName $importPath
            if (-not (Test-Path $resolvedTarget)) {
                throw "存在しないモジュールを参照しています ($($jsFile.Name)): $importPath"
            }
        }
    }
    Write-Host "  [OK] $($jsFile.Name)" -ForegroundColor Green
}

Write-Host "=== [4/4] hardcore_guard.mcaddon パッケージ生成 ===" -ForegroundColor Cyan

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

if (Test-Path $OutputMcaddon) {
    Remove-Item -Path $OutputMcaddon -Force
}

$zipStream = [System.IO.File]::Open($OutputMcaddon, [System.IO.FileMode]::Create)
try {
    $archive = New-Object System.IO.Compression.ZipArchive($zipStream, [System.IO.Compression.ZipArchiveMode]::Create, $false)
    try {
        foreach ($packDir in @($BpDir, $RpDir)) {
            $packName = Split-Path $packDir -Leaf
            $files = Get-ChildItem -Path $packDir -File -Recurse
            foreach ($file in $files) {
                $relPath = $file.FullName.Substring($packDir.Length + 1).Replace('\', '/')
                $entryName = "$packName/$relPath"
                [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                    $archive,
                    $file.FullName,
                    $entryName,
                    [System.IO.Compression.CompressionLevel]::Optimal
                ) | Out-Null
            }
        }
    }
    finally {
        $archive.Dispose()
    }
}
finally {
    $zipStream.Dispose()
}

$mcaddonInfo = Get-Item $OutputMcaddon
Write-Host "完了: $($mcaddonInfo.FullName) ($($mcaddonInfo.Length) bytes)" -ForegroundColor Green
