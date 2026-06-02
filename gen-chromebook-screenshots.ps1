Add-Type -AssemblyName System.Drawing

$W = 1920; $H = 1080
$outDir = 'C:\Users\adria\road-events\play-store-assets\screenshots\chromebook'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function Draw-MapIcon {
    param($g, $cx, $cy, $size, $color)
    $r = [int]($size * 0.38)
    $br = New-Object System.Drawing.SolidBrush($color)
    $g.FillEllipse($br, $cx - $r, $cy - $size/2, $r*2, $r*2)
    $pts = @(
        [System.Drawing.Point]::new($cx - $r, $cy - $size/2 + $r*2 - 4),
        [System.Drawing.Point]::new($cx + $r, $cy - $size/2 + $r*2 - 4),
        [System.Drawing.Point]::new($cx, $cy + $size/2)
    )
    $g.FillPolygon($br, $pts)
    $wbr = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $ir = [int]($r * 0.45)
    $g.FillEllipse($wbr, $cx - $ir, $cy - $size/2 + $r - $ir, $ir*2, $ir*2)
    $br.Dispose(); $wbr.Dispose()
}

function Draw-AlertIcon {
    param($g, $cx, $cy, $size, $color)
    $br = New-Object System.Drawing.SolidBrush($color)
    $h = [int]($size * 0.9)
    $pts = @(
        [System.Drawing.Point]::new($cx, $cy - $h/2),
        [System.Drawing.Point]::new($cx + [int]($h*0.58), $cy + $h/2),
        [System.Drawing.Point]::new($cx - [int]($h*0.58), $cy + $h/2)
    )
    $g.FillPolygon($br, $pts)
    $wbr = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30,30,50))
    $fnt = New-Object System.Drawing.Font('Segoe UI', [int]($size*0.38), [System.Drawing.FontStyle]::Bold)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rect = [System.Drawing.RectangleF]::new($cx - $h*0.58, $cy - $h/2, $h*1.16, $h)
    $g.DrawString('!', $fnt, $wbr, $rect, $sf)
    $br.Dispose(); $wbr.Dispose(); $fnt.Dispose()
}

function Draw-StarIcon {
    param($g, $cx, $cy, $size, $color)
    $br = New-Object System.Drawing.SolidBrush($color)
    $pts = [System.Collections.Generic.List[System.Drawing.Point]]::new()
    $n = 5; $outer = $size/2; $inner = $size/4
    for ($i = 0; $i -lt $n*2; $i++) {
        $angle = ($i * [Math]::PI / $n) - [Math]::PI/2
        $r2 = if ($i % 2 -eq 0) { $outer } else { $inner }
        $pts.Add([System.Drawing.Point]::new(
            [int]($cx + $r2 * [Math]::Cos($angle)),
            [int]($cy + $r2 * [Math]::Sin($angle))
        ))
    }
    $g.FillPolygon($br, $pts.ToArray())
    $br.Dispose()
}

function Draw-CheckIcon {
    param($g, $cx, $cy, $size, $color)
    $br = New-Object System.Drawing.SolidBrush($color)
    $g.FillEllipse($br, $cx - $size/2, $cy - $size/2, $size, $size)
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, [int]($size*0.12))
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap   = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($pen, $cx - $size*0.28, $cy,            $cx - $size*0.05, $cy + $size*0.25)
    $g.DrawLine($pen, $cx - $size*0.05, $cy + $size*0.25, $cx + $size*0.30, $cy - $size*0.22)
    $br.Dispose(); $pen.Dispose()
}

function Draw-MegaphoneIcon {
    param($g, $cx, $cy, $size, $color)
    $br = New-Object System.Drawing.SolidBrush($color)
    $bw = [int]($size * 0.55); $bh = [int]($size * 0.38)
    $g.FillRectangle($br, $cx - $bw/2, $cy - $bh/2, $bw, $bh)
    $pts = @(
        [System.Drawing.Point]::new($cx + $bw/2, $cy - $bh/2),
        [System.Drawing.Point]::new($cx + $bw/2, $cy + $bh/2),
        [System.Drawing.Point]::new($cx + [int]($size*0.52), $cy + [int]($size*0.44)),
        [System.Drawing.Point]::new($cx + [int]($size*0.52), $cy - [int]($size*0.44))
    )
    $g.FillPolygon($br, $pts)
    $g.FillRectangle($br, $cx - $bw/2 - [int]($size*0.12), $cy - $bh/4, [int]($size*0.12), $bh/2)
    $br.Dispose()
}

function Draw-Icon {
    param($g, $type, $cx, $cy, $size, $color)
    switch ($type) {
        'map'       { Draw-MapIcon       $g $cx $cy $size $color }
        'alert'     { Draw-AlertIcon     $g $cx $cy $size $color }
        'star'      { Draw-StarIcon      $g $cx $cy $size $color }
        'check'     { Draw-CheckIcon     $g $cx $cy $size $color }
        'megaphone' { Draw-MegaphoneIcon $g $cx $cy $size $color }
    }
}

function Make-Screenshot {
    param($filename, $title, $subtitle, $items, $accent, $iconType, $badge)

    $bmp = New-Object System.Drawing.Bitmap($W, $H)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

    $accentColor = [System.Drawing.ColorTranslator]::FromHtml($accent)

    # ── Background ──────────────────────────────────────────────────
    $topC    = [System.Drawing.Color]::FromArgb(255,12,12,22)
    $bottomC = [System.Drawing.Color]::FromArgb(255,22,22,42)
    $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        [System.Drawing.Point]::new(0,0), [System.Drawing.Point]::new($W,0),
        $topC, $bottomC)
    $g.FillRectangle($grad, 0, 0, $W, $H)

    # Accent left stripe
    $stripeBr = New-Object System.Drawing.SolidBrush($accentColor)
    $g.FillRectangle($stripeBr, 0, 0, 10, $H)
    $stripeBr.Dispose()

    # ── LEFT PANEL — map/icon area (60% width) ───────────────────────
    $mapW = [int]($W * 0.60)
    $fX = 40; $fY = 40; $fW = $mapW - 60; $fH = $H - 80

    $frameBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255,18,28,52))
    $g.FillRectangle($frameBg, $fX, $fY, $fW, $fH)
    $framePen = New-Object System.Drawing.Pen($accentColor, 3)
    $g.DrawRectangle($framePen, $fX, $fY, $fW, $fH)
    $frameBg.Dispose(); $framePen.Dispose()

    # Grid
    $gridPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(22,255,255,255), 1)
    for ($x = $fX; $x -lt $fX+$fW; $x += 90) { $g.DrawLine($gridPen, $x, $fY, $x, $fY+$fH) }
    for ($y = $fY; $y -lt $fY+$fH; $y += 90) { $g.DrawLine($gridPen, $fX, $y, $fX+$fW, $y) }
    $gridPen.Dispose()

    # Map pins
    $pinDefs = @(
        @{ x=120; y=130; c='#FF5722' },
        @{ x=680; y=180; c='#4CAF50' },
        @{ x=380; y=380; c='#2196F3' },
        @{ x=820; y=420; c='#FF9800' },
        @{ x=100; y=560; c='#9C27B0' },
        @{ x=560; y=620; c='#00BCD4' },
        @{ x=780; y=680; c='#E91E63' }
    )
    foreach ($pd in $pinDefs) {
        $pc = [System.Drawing.ColorTranslator]::FromHtml($pd.c)
        Draw-MapIcon $g ($fX + $pd.x) ($fY + $pd.y) 48 $pc
    }

    # Central icon with glow
    $icx = [int]($fX + $fW / 2)
    $icy = [int]($fY + $fH / 2)
    $glowBr = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(20, $accentColor.R, $accentColor.G, $accentColor.B))
    for ($gi = 5; $gi -ge 1; $gi--) {
        $gr2 = 100 + $gi * 28
        $g.FillEllipse($glowBr, $icx - $gr2, $icy - $gr2, $gr2*2, $gr2*2)
    }
    $glowBr.Dispose()
    Draw-Icon $g $iconType $icx $icy 180 $accentColor

    # Badge
    if ($badge) {
        $badgeFont   = New-Object System.Drawing.Font('Segoe UI', 18, [System.Drawing.FontStyle]::Bold)
        $badgeBr     = New-Object System.Drawing.SolidBrush($accentColor)
        $badgeTextBr = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        $badgeSf     = New-Object System.Drawing.StringFormat
        $badgeSf.Alignment     = [System.Drawing.StringAlignment]::Center
        $badgeSf.LineAlignment = [System.Drawing.StringAlignment]::Center
        $bx = $icx - 130; $by = $fY + $fH - 62
        $g.FillRectangle($badgeBr, $bx, $by, 260, 46)
        $g.DrawString($badge, $badgeFont, $badgeTextBr, [System.Drawing.RectangleF]::new($bx,$by,260,46), $badgeSf)
        $badgeFont.Dispose(); $badgeBr.Dispose(); $badgeTextBr.Dispose()
    }

    # ── RIGHT PANEL — text (40% width) ────────────────────────────────
    $rX = $mapW + 20
    $rW = $W - $rX - 40

    # Accent bar at top of right panel
    $acBr = New-Object System.Drawing.SolidBrush($accentColor)
    $g.FillRectangle($acBr, $rX, 40, $rW, 6)
    $acBr.Dispose()

    # Title
    $titleFont = New-Object System.Drawing.Font('Segoe UI', 46, [System.Drawing.FontStyle]::Bold)
    $titleBr   = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $titleSf   = New-Object System.Drawing.StringFormat
    $titleSf.Alignment = [System.Drawing.StringAlignment]::Near
    $g.DrawString($title, $titleFont, $titleBr, [System.Drawing.RectangleF]::new($rX, 68, $rW, 100), $titleSf)
    $titleFont.Dispose()

    # Divider
    $divBr = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(60,$accentColor.R,$accentColor.G,$accentColor.B))
    $g.FillRectangle($divBr, $rX, 178, $rW, 2)
    $divBr.Dispose()

    # Subtitle
    $subFont = New-Object System.Drawing.Font('Segoe UI', 26)
    $subBr   = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(170,255,255,255))
    $g.DrawString($subtitle, $subFont, $subBr, [System.Drawing.RectangleF]::new($rX, 192, $rW, 65), $titleSf)
    $subFont.Dispose(); $subBr.Dispose()

    # Items (single column, more space)
    $itemFont = New-Object System.Drawing.Font('Segoe UI', 25)
    $itemBr   = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(215,255,255,255))
    $dotBr    = New-Object System.Drawing.SolidBrush($accentColor)
    $itemY = 275
    $lineH = 68
    foreach ($item in $items) {
        $g.FillEllipse($dotBr, $rX, $itemY + 12, 14, 14)
        $g.DrawString($item, $itemFont, $itemBr, [System.Drawing.RectangleF]::new($rX + 28, $itemY, $rW - 28, 58))
        $itemY += $lineH
    }
    $itemFont.Dispose(); $itemBr.Dispose(); $dotBr.Dispose()

    # Alertoo brand bottom-right
    $brandFont = New-Object System.Drawing.Font('Segoe UI', 26, [System.Drawing.FontStyle]::Bold)
    $brandBr   = New-Object System.Drawing.SolidBrush($accentColor)
    $brandSf   = New-Object System.Drawing.StringFormat
    $brandSf.Alignment = [System.Drawing.StringAlignment]::Near
    $g.DrawString('ALERTOO', $brandFont, $brandBr, [System.Drawing.RectangleF]::new($rX, $H - 72, $rW, 52), $brandSf)
    $brandFont.Dispose(); $brandBr.Dispose()

    # Bottom accent stripe
    $acBr2 = New-Object System.Drawing.SolidBrush($accentColor)
    $g.FillRectangle($acBr2, 0, $H-8, $W, 8)
    $acBr2.Dispose()

    $g.Dispose()
    $bmp.Save($outDir + '\' + $filename, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Saved $filename"
}

# Generate all 5
Make-Screenshot '01-mapa.png'       'Mapa em Tempo Real'     'Blitz, acidentes e eventos perto de voce'    @('Blitz da Lei Seca','Acidentes e obras','Alagamentos na via','Shows e festivais','Pins por categoria','Atualizado ao vivo') '#FF5722' 'map'       'AO VIVO'
Make-Screenshot '02-reportar.png'   'Reporte em 1 Toque'     'Ajude outros motoristas em segundos'         @('Sem cadastro','Localizacao automatica','Blitz, acidente, obra','Ganhe pontos','Confirmado pela comunidade','Rapido e simples') '#F44336' 'alert'     'REPORTE AGORA'
Make-Screenshot '03-eventos.png'    'Eventos Perto de Voce'  'Bares, shows e festas na sua cidade'         @('Filtro por categoria','Filtro por distancia','Salve favoritos','Abra no Google Maps','Receba lembretes','Descubra novidades') '#4CAF50' 'star'      'DESCUBRA'
Make-Screenshot '04-comunidade.png' 'Comunidade Ativa'       'Confirme alertas e suba no ranking'          @('Confirme alertas','Negue alertas falsos','Comente e curta','Iniciante ate Lenda','Ranking semanal','Sistema de reputacao') '#2196F3' 'check'     'PARTICIPE'
Make-Screenshot '05-promover.png'   'Promova Seu Negocio'    'Pacotes Bronze, Prata e Ouro'                @('A partir de R$ 4,99','Foto em destaque','Animacao exclusiva','Tag colorida no mapa','Creditos gratis','Mais visibilidade') '#FF9800' 'megaphone' 'ANUNCIE JA'

Write-Host 'All Chromebook screenshots done!'
