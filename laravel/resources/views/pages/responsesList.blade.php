<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmação de Check-in - King Forms</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="apple-touch-icon" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="stylesheet" href="/vendor/fontawesome/css/all.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            background: #0D0D0F;
            color: #ECECEC;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            min-height: 100vh;
            padding: 0;
        }
        
        .page-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 32px 20px;
        }
        
        /* Mobile: ajustar page-container para não limitar largura */
        @media (max-width: 768px) {
            .page-container {
                max-width: 100% !important;
                width: 100% !important;
                padding: 8px 0 !important;
                margin: 0 !important;
                box-sizing: border-box !important;
            }
        }
        
        .page-header {
            background: linear-gradient(135deg, #1C1C21 0%, #0D0D0F 100%);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 24px;
            padding: 32px 40px;
            margin-bottom: 24px;
            box-shadow: 0 30px 80px rgba(0,0,0,0.8);
        }
        
        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
        }
        
        .header-title {
            display: flex;
            align-items: center;
            gap: 16px;
        }
        
        .header-title h1 {
            font-size: 32px;
            font-weight: 800;
            background: linear-gradient(135deg, #ECECEC 0%, #A1A1A1 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin: 0;
        }
        
        .btn-voltar {
            padding: 12px 24px;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            color: #ECECEC;
            border-radius: 12px;
            cursor: pointer;
            font-weight: 600;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s;
        }
        
        .btn-voltar:hover {
            background: rgba(255,199,0,0.2);
            border-color: #FFC700;
            color: #FFC700;
        }
        
        .tabs-container {
            display: flex;
            gap: 8px;
            border-bottom: 2px solid rgba(255,255,255,0.1);
            flex-wrap: wrap;
        }
        
        .tab-btn {
            padding: 12px 24px;
            background: transparent;
            border: none;
            color: #A1A1A1;
            font-weight: 600;
            font-size: 15px;
            cursor: pointer;
            border-bottom: 3px solid transparent;
            transition: all 0.3s;
            position: relative;
            top: 2px;
        }
        
        .tab-btn.active {
            color: #FFC700;
            border-bottom-color: #FFC700;
        }
        
        .tab-btn:hover {
            color: #ECECEC;
        }
        
        .content-section {
            background: linear-gradient(135deg, #1C1C21 0%, #0D0D0F 100%);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 24px;
            padding: 32px 40px;
            box-shadow: 0 30px 80px rgba(0,0,0,0.8);
            max-height: calc(100vh - 250px);
            overflow-y: auto;
            overflow-x: hidden;
        }
        
        @media (max-width: 768px) {
            .page-header {
                padding: 16px 8px !important;
                margin-bottom: 12px !important;
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }
            
            .content-section {
                padding: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }
        }
        
        /* Custom Scrollbar */
        .content-section::-webkit-scrollbar,
        .links-hero-section::-webkit-scrollbar,
        .items-list::-webkit-scrollbar {
            width: 10px;
        }
        
        .content-section::-webkit-scrollbar-track,
        .links-hero-section::-webkit-scrollbar-track,
        .items-list::-webkit-scrollbar-track {
            background: rgba(255,255,255,0.05);
            border-radius: 10px;
        }
        
        .content-section::-webkit-scrollbar-thumb,
        .links-hero-section::-webkit-scrollbar-thumb,
        .items-list::-webkit-scrollbar-thumb {
            background: rgba(255,199,0,0.3);
            border-radius: 10px;
        }
        
        .content-section::-webkit-scrollbar-thumb:hover,
        .links-hero-section::-webkit-scrollbar-thumb:hover,
        .items-list::-webkit-scrollbar-thumb:hover {
            background: rgba(255,199,0,0.5);
        }
        
        /* Scrollbar para Firefox - DESKTOP APENAS */
        .content-section,
        .items-list {
            scrollbar-width: thin;
            scrollbar-color: rgba(255,199,0,0.3) rgba(255,255,255,0.05);
        }
        
        /* No mobile, REMOVER scrollbar de links-hero-section */
        @media (max-width: 768px) {
            .links-hero-section::-webkit-scrollbar,
            .links-hero-section::-webkit-scrollbar-track,
            .links-hero-section::-webkit-scrollbar-thumb {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
                opacity: 0 !important;
                background: transparent !important;
            }
        }
        
        /* SEM rolagem interna: apenas a content-section rola. Links ocupam a tela e ficam visíveis. */
        .links-hero-section {
            max-height: none;
            min-height: auto;
            overflow: visible;
            overflow-x: hidden;
            width: 100%;
            box-sizing: border-box;
        }
        
        .links-hero-section::-webkit-scrollbar,
        .links-hero-section::-webkit-scrollbar-track,
        .links-hero-section::-webkit-scrollbar-thumb {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
        }
        
        @media (max-width: 768px) {
            .links-hero-section {
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 8px 0 !important;
                box-sizing: border-box !important;
            }
        }
        
        .items-list {
            max-height: calc(100vh - 500px);
            overflow-y: auto;
            overflow-x: hidden;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 32px;
        }
        
        .stat-card {
            padding: 20px;
            border-radius: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        
        .stat-card.green {
            background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
        }
        
        .stat-card.pink {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        
        .stat-card.purple {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .stat-card.blue {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }
        
        .stat-content {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
        }
        
        .stat-value {
            font-size: 24px;
            font-weight: 800;
        }
        
        .stat-label {
            font-size: 13px;
            opacity: 0.9;
            font-weight: 500;
        }
        
        .search-bar {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
            flex-wrap: wrap;
        }
        
        .search-input {
            flex: 1;
            min-width: 200px;
            padding: 14px 18px;
            border-radius: 12px;
            background: rgba(255,255,255,0.05);
            border: 2px solid rgba(255,255,255,0.1);
            color: #ECECEC;
            font-size: 14px;
            transition: all 0.3s;
        }
        
        .search-input:focus {
            outline: none;
            border-color: #FFC700;
            background: rgba(255,199,0,0.1);
        }

        .lead-toolbar {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
            padding: 12px 14px;
            border-radius: 14px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
        }
        .lead-sort-row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: center;
        }
        .lead-sort-row label {
            color: #A1A1A1;
            font-size: 13px;
            font-weight: 600;
            margin-right: 4px;
        }
        .lead-sort-select {
            padding: 10px 14px;
            border-radius: 10px;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.12);
            color: #ECECEC;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
        }
        .lead-result-count {
            color: #A1A1A1;
            font-size: 13px;
            font-weight: 600;
        }
        .lead-toolbar-filters {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            width: 100%;
            align-items: center;
        }
        .lead-chip {
            padding: 8px 12px;
            border-radius: 999px;
            border: 1px solid rgba(255,255,255,0.12);
            background: rgba(255,255,255,0.04);
            color: #A1A1A1;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
        }
        .lead-chip.active {
            background: linear-gradient(135deg, #FFC700, #FFA500);
            color: #000;
            border-color: transparent;
        }
        .lead-chip.ok.active {
            background: linear-gradient(135deg, #25D366, #128C7E);
            color: #fff;
        }
        .lead-date-group {
            margin: 18px 0 10px;
            padding: 8px 4px;
            color: #FFC700;
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .lead-date-group::after {
            content: '';
            flex: 1;
            height: 1px;
            background: rgba(255,199,0,0.2);
        }
        .lead-card.contacted {
            opacity: 0.78;
            border-color: rgba(37,211,102,0.25) !important;
        }
        .lead-card.favorited .item-title {
            color: #FFC700;
        }
        .lead-mini-actions {
            display: flex;
            gap: 6px;
            flex-shrink: 0;
        }
        .lead-mini-btn {
            width: 34px;
            height: 34px;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,0.12);
            background: rgba(255,255,255,0.05);
            color: #A1A1A1;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }
        .lead-mini-btn.on-star { color: #FFC700; border-color: rgba(255,199,0,0.4); }
        .lead-mini-btn.on-check { color: #25D366; border-color: rgba(37,211,102,0.4); }
        .lead-status-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
        }
        .lead-status-pill.pending { background: rgba(255,199,0,0.12); color: #FFC700; }
        .lead-status-pill.done { background: rgba(37,211,102,0.15); color: #25D366; }
        .lead-card {
            cursor: pointer;
            transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
        }
        .lead-card:hover {
            transform: translateY(-2px);
            border-color: rgba(255,199,0,0.35) !important;
            box-shadow: 0 10px 28px rgba(0,0,0,0.35);
        }
        .lead-card-preview {
            color: #A1A1A1;
            font-size: 13px;
            margin-top: 8px;
            line-height: 1.5;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        .lead-detail-overlay {
            position: fixed;
            inset: 0;
            z-index: 12000;
            background: #0D0D0F;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            animation: leadPageIn 0.28s ease;
        }
        @keyframes leadPageIn {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .lead-detail-page {
            min-height: 100%;
            max-width: 920px;
            margin: 0 auto;
            padding: 0 0 48px;
        }
        .lead-detail-topbar {
            position: sticky;
            top: 0;
            z-index: 5;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 14px 18px;
            background: rgba(13,13,15,0.92);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .lead-back-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,0.12);
            background: rgba(255,255,255,0.05);
            color: #ECECEC;
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
        }
        .lead-detail-hero {
            margin: 18px 18px 0;
            padding: 28px 24px;
            border-radius: 22px;
            background:
                radial-gradient(ellipse at top right, rgba(255,199,0,0.18), transparent 55%),
                linear-gradient(160deg, #1C1C21 0%, #121216 100%);
            border: 1px solid rgba(255,255,255,0.08);
            text-align: center;
        }
        .lead-avatar {
            width: 88px;
            height: 88px;
            margin: 0 auto 16px;
            border-radius: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            font-weight: 800;
            color: #000;
            background: linear-gradient(135deg, #FFC700, #FFA500);
            box-shadow: 0 12px 30px rgba(255,199,0,0.25);
        }
        .lead-detail-hero h1 {
            margin: 0 0 8px;
            font-size: clamp(24px, 5vw, 34px);
            font-weight: 800;
            color: #ECECEC;
            line-height: 1.2;
            word-break: break-word;
        }
        .lead-detail-hero .lead-sub {
            color: #A1A1A1;
            font-size: 14px;
            font-weight: 500;
        }
        .lead-action-row {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            justify-content: center;
            margin: 20px 18px 8px;
        }
        .lead-action-btn {
            flex: 1 1 140px;
            max-width: 220px;
            padding: 14px 16px;
            border-radius: 12px;
            border: none;
            font-weight: 700;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            text-decoration: none;
            color: #fff;
            font-size: 14px;
        }
        .lead-detail-section {
            margin: 20px 18px 0;
        }
        .lead-detail-section-title {
            font-size: 13px;
            color: #FFC700;
            font-weight: 700;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .lead-detail-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 12px;
        }
        .lead-detail-field {
            padding: 16px 16px;
            border-radius: 14px;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
        }
        .lead-detail-field .label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #A1A1A1;
            margin-bottom: 8px;
            font-weight: 700;
        }
        .lead-detail-field .value {
            color: #ECECEC;
            font-size: 15px;
            font-weight: 500;
            word-break: break-word;
            white-space: pre-wrap;
            line-height: 1.45;
        }
        .lead-detail-field.wide {
            grid-column: 1 / -1;
        }
        @media (max-width: 640px) {
            .lead-detail-hero { margin: 12px 12px 0; padding: 22px 16px; }
            .lead-action-row, .lead-detail-section { margin-left: 12px; margin-right: 12px; }
            .lead-action-btn { max-width: none; }
            .lead-detail-topbar { padding: 12px; }
        }

        
        .btn-export {
            padding: 14px 20px;
            border: none;
            border-radius: 12px;
            color: white;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s;
            text-decoration: none;
        }
        
        .btn-export:hover {
            transform: scale(1.05);
        }
        
        .btn-export.pdf {
            background: linear-gradient(135deg, #DC2626, #B91C1C);
        }
        
        .btn-export.csv {
            background: linear-gradient(135deg, #10B981, #059669);
        }
        
        .btn-export.excel {
            background: linear-gradient(135deg, #FFC700, #FFA500);
            color: #000;
        }
        
        .items-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        
        .item-card {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 20px;
            transition: all 0.3s;
        }
        
        .item-card:hover {
            background: rgba(255,199,0,0.05);
            border-color: rgba(255,199,0,0.3);
        }
        
        .item-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            gap: 16px;
            margin-bottom: 12px;
        }
        
        .item-title {
            font-size: 18px;
            font-weight: 700;
            color: #ECECEC;
            margin: 0;
        }
        
        .status-badge {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            white-space: nowrap;
        }
        
        .status-badge.success {
            background: rgba(67, 233, 123, 0.2);
            color: #43e97b;
        }
        
        .status-badge.warning {
            background: rgba(245, 158, 11, 0.2);
            color: #f59e0b;
        }
        
        .status-badge.info {
            background: rgba(59, 130, 246, 0.2);
            color: #3b82f6;
        }
        
        .item-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
            color: #A1A1A1;
            font-size: 14px;
        }
        
        .item-action {
            padding: 10px 20px;
            background: linear-gradient(135deg, #43e97b, #38f9d7);
            border: none;
            border-radius: 8px;
            color: #000;
            font-weight: 600;
            cursor: pointer;
            white-space: nowrap;
            font-size: 13px;
            min-width: fit-content;
        }
        
        .item-action.delete {
            background: linear-gradient(135deg, #d32f2f, #b71c1c);
            color: white;
        }
        
        .item-action.delete:hover {
            background: linear-gradient(135deg, #b71c1c, #8b0000);
        }
        
        .guest-checkbox {
            width: 20px;
            height: 20px;
            cursor: pointer;
            accent-color: #FFC700;
        }
        
        .admin-controls {
            background: rgba(211, 47, 47, 0.1);
            border: 1px solid rgba(211, 47, 47, 0.3);
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            flex-wrap: wrap;
        }
        
        .admin-controls-left {
            display: flex;
            align-items: center;
            gap: 16px;
        }
        
        .admin-controls-right {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .btn-delete-admin {
            padding: 10px 20px;
            background: #d32f2f;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        
        .btn-delete-admin:hover {
            background: #b71c1c;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(211, 47, 47, 0.4);
        }
        
        .btn-delete-admin:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        
        .loading {
            text-align: center;
            padding: 60px 20px;
            color: #A1A1A1;
        }
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
        }
        
        .empty-icon {
            font-size: 4rem;
            color: #2C2C2F;
            margin-bottom: 20px;
        }
        
        .empty-title {
            color: #ECECEC;
            font-size: 24px;
            margin: 0 0 12px 0;
        }
        
        .empty-text {
            color: #A1A1A1;
            margin: 0;
        }
        
        .links-section {
            background: rgba(255,199,0,0.05);
            border: 2px solid rgba(255,199,0,0.2);
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 32px;
        }
        
        .links-section h3 {
            color: #FFC700;
            font-size: 20px;
            font-weight: 700;
            margin: 0 0 20px 0;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .link-item {
            margin-bottom: 20px;
            padding: 16px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
        }
        
        .link-item:last-child {
            margin-bottom: 0;
        }
        
        .link-item-label {
            color: #ECECEC;
            font-weight: 600;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .link-item-description {
            color: #A1A1A1;
            font-size: 13px;
            margin-bottom: 12px;
        }
        
        .link-input-group {
            display: flex;
            gap: 12px;
            align-items: center;
        }
        
        .link-input-group input {
            flex: 1;
            padding: 12px 16px;
            background: #0D0D0F;
            border: 2px solid #2C2C2F;
            border-radius: 8px;
            color: #ECECEC;
            font-size: 14px;
            font-family: monospace;
        }
        
        .link-input-group input:focus {
            outline: none;
            border-color: #FFC700;
        }
        
        .btn-copy-link {
            padding: 12px 24px;
            background: linear-gradient(135deg, #FFC700, #FFA500);
            border: none;
            border-radius: 8px;
            color: #000;
            font-weight: 700;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.3s;
        }
        
        .btn-copy-link:hover {
            transform: scale(1.05);
        }
        
        .btn-copy-link.blue {
            background: linear-gradient(135deg, #4A90E2, #357ABD);
            color: #fff;
        }
        
        .btn-copy-link.green {
            background: linear-gradient(135deg, #43e97b, #38f9d7);
            color: #000;
        }
        
        /* Seção de Links Grande e Visível */
        .links-hero-section {
            background: linear-gradient(135deg, rgba(255,199,0,0.15) 0%, rgba(255,165,0,0.05) 100%);
            border: 2px solid rgba(255,199,0,0.4);
            border-radius: 20px;
            padding: 32px;
            margin-bottom: 32px;
        }
        
        @media (max-width: 768px) {
            /* No mobile, remover bordas pretas e espaços - deixar conteúdo direto */
            .links-hero-section {
                padding: 8px 4px !important;
                margin: 0 !important;
                border-radius: 12px !important;
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                /* SEM rolagem interna - TOTALMENTE REMOVIDA */
                overflow-y: visible !important;
                overflow-x: hidden !important;
                max-height: none !important;
                height: auto !important;
                -webkit-overflow-scrolling: auto !important;
                scrollbar-width: none !important;
            }
            
            /* Remover scrollbar COMPLETAMENTE no mobile */
            .links-hero-section::-webkit-scrollbar {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
                opacity: 0 !important;
            }
            
            /* Garantir que elementos dentro não tenham rolagem */
            .links-hero-section * {
                overflow-y: visible !important;
                max-height: none !important;
            }
            
            /* Remover bordas/backgrounds pretos dos link-cards internos */
            .link-card.cadastro {
                background: rgba(67,233,123,0.15) !important;
                border: 2px solid rgba(67,233,123,0.5) !important;
                padding: 20px 16px !important;
                border-radius: 16px !important;
                margin-bottom: 16px !important;
            }
            
            .link-card.portaria {
                background: rgba(74,144,226,0.15) !important;
                border: 2px solid rgba(74,144,226,0.5) !important;
                padding: 20px 16px !important;
                border-radius: 16px !important;
            }
        }
        
        .links-hero-title {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid rgba(255,199,0,0.3);
        }
        
        .links-hero-title h2 {
            color: #FFC700;
            font-size: 24px;
            font-weight: 800;
            margin: 0;
        }
        
        .links-hero-title i {
            font-size: 28px;
            color: #FFC700;
        }
        
        .links-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
            width: 100%;
            box-sizing: border-box;
        }
        
        /* Desktop - Ajustar inputs e botões para não cortar */
        @media (min-width: 769px) {
            .link-card-input-group {
                width: 100%;
                max-width: 100%;
                box-sizing: border-box;
            }
            
            .link-card-input-group input {
                min-width: 200px;
                max-width: calc(100% - 150px);
                word-break: break-all;
                overflow-wrap: anywhere;
                box-sizing: border-box;
            }
            
            .link-card-input-group .link-card-btn {
                min-width: 140px;
                flex-shrink: 0;
            }
            
            /* Ajustar inputs de slug personalizado */
            #portaria-slug-input {
                min-width: 200px !important;
                max-width: calc(100% - 200px) !important;
                word-break: break-all !important;
                overflow-wrap: anywhere !important;
                box-sizing: border-box !important;
            }
            
            /* Garantir que botões dentro de div flex não cortem */
            div[style*="display: flex"][style*="align-items: stretch"] {
                width: 100%;
                max-width: 100%;
                box-sizing: border-box;
            }
        }
        
        @media (max-width: 768px) {
            .links-grid {
                grid-template-columns: 1fr !important;
                gap: 16px;
                width: 100%;
            }
            
            /* Reorganizar links personalizados no mobile */
            .personalized-link-item-mobile .link-item-desktop {
                display: none !important;
            }
            
            .personalized-link-item-mobile .link-item-mobile {
                display: block !important;
            }
            
            /* Garantir ordem: Links de Cadastro primeiro, depois Link da Portaria */
            .links-grid {
                display: flex !important;
                flex-direction: column !important;
            }
            
            .link-card.cadastro {
                order: 1;
            }
            
            .link-card.portaria {
                order: 2;
            }
        }
        
        /* Desktop: mostrar versão desktop, ocultar mobile */
        @media (min-width: 769px) {
            .personalized-link-item-mobile .link-item-desktop {
                display: flex !important;
            }
            
            .personalized-link-item-mobile .link-item-mobile {
                display: none !important;
            }
        }
        
        .link-card {
            background: rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 16px;
            padding: 24px;
            transition: all 0.3s;
        }
        
        .link-card:hover {
            border-color: rgba(255,199,0,0.5);
            transform: translateY(-2px);
        }
        
        .link-card.portaria {
            border-color: rgba(74,144,226,0.5);
            background: rgba(74,144,226,0.1);
        }
        
        .link-card.cadastro {
            border-color: rgba(67,233,123,0.5);
            background: rgba(67,233,123,0.1);
        }
        
        .link-card-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
        }
        
        .link-card-icon {
            width: 50px;
            height: 50px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }
        
        .link-card-icon.portaria {
            background: linear-gradient(135deg, #4A90E2, #357ABD);
            color: #fff;
        }
        
        .link-card-icon.cadastro {
            background: linear-gradient(135deg, #43e97b, #38f9d7);
            color: #000;
        }
        
        .link-card-title {
            color: #ECECEC;
            font-size: 18px;
            font-weight: 700;
            margin: 0;
        }
        
        .link-card-subtitle {
            color: #A1A1A1;
            font-size: 13px;
            margin: 0;
        }
        
        .link-card-description {
            color: #A1A1A1;
            font-size: 14px;
            margin-bottom: 16px;
            line-height: 1.5;
        }
        
        .link-card-input-group {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: stretch;
            width: 100%;
            min-width: 0;
            box-sizing: border-box;
        }
        
        .link-card-input-group input {
            flex: 1 1 auto;
            min-width: 0;
            max-width: 100%;
            padding: 12px 14px;
            background: rgba(0,0,0,0.4);
            border: 2px solid rgba(255,255,255,0.1);
            border-radius: 10px;
            color: #ECECEC;
            box-sizing: border-box;
            word-break: break-all;
            overflow-wrap: anywhere;
            font-size: 13px;
            font-family: monospace;
            overflow-x: auto;
            overflow-y: hidden;
        }
        
        .link-card-input-group input:focus {
            outline: none;
            border-color: #FFC700;
        }
        
        .link-card-btn {
            padding: 12px 16px;
            border: none;
            white-space: nowrap;
            flex-shrink: 0;
            box-sizing: border-box;
            border-radius: 10px;
            font-weight: 700;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            flex-shrink: 0;
            min-width: fit-content;
        }
        
        .link-card-btn:hover {
            transform: scale(1.05);
        }
        
        .link-card-btn.portaria {
            background: linear-gradient(135deg, #4A90E2, #357ABD);
            color: #fff;
        }
        
        .link-card-btn.cadastro {
            background: linear-gradient(135deg, #43e97b, #38f9d7);
            color: #000;
        }
        
        /* Stats Cards Melhorados */
        .stats-hero-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }
        
        .stat-hero-card {
            background: linear-gradient(135deg, #1C1C21 0%, #0D0D0F 100%);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 16px;
            padding: 24px;
            text-align: center;
            transition: all 0.3s;
        }
        
        .stat-hero-card:hover {
            border-color: rgba(255,199,0,0.3);
            transform: translateY(-2px);
        }
        
        .stat-hero-card.total {
            border-color: rgba(255,199,0,0.3);
            background: linear-gradient(135deg, rgba(255,199,0,0.1) 0%, #0D0D0F 100%);
        }
        
        .stat-hero-card.chegou {
            border-color: rgba(67,233,123,0.3);
            background: linear-gradient(135deg, rgba(67,233,123,0.1) 0%, #0D0D0F 100%);
        }
        
        .stat-hero-card.falta {
            border-color: rgba(255,68,68,0.3);
            background: linear-gradient(135deg, rgba(255,68,68,0.1) 0%, #0D0D0F 100%);
        }
        
        .stat-hero-card.confirmados {
            border-color: rgba(74,144,226,0.3);
            background: linear-gradient(135deg, rgba(74,144,226,0.1) 0%, #0D0D0F 100%);
        }
        
        .stat-hero-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 12px;
            font-size: 22px;
        }
        
        .stat-hero-icon.total {
            background: rgba(255,199,0,0.2);
            color: #FFC700;
        }
        
        .stat-hero-icon.chegou {
            background: rgba(67,233,123,0.2);
            color: #43e97b;
        }
        
        .stat-hero-icon.falta {
            background: rgba(255,68,68,0.2);
            color: #ff4444;
        }
        
        .stat-hero-icon.confirmados {
            background: rgba(74,144,226,0.2);
            color: #4A90E2;
        }
        
        .stat-hero-value {
            font-size: 36px;
            font-weight: 800;
            margin: 8px 0;
        }
        
        .stat-hero-value.total { color: #FFC700; }
        .stat-hero-value.chegou { color: #43e97b; }
        .stat-hero-value.falta { color: #ff4444; }
        .stat-hero-value.confirmados { color: #4A90E2; }
        
        .stat-hero-label {
            color: #A1A1A1;
            font-size: 14px;
            font-weight: 600;
        }
        
        @media (max-width: 768px) {
            .page-container {
                padding: 16px;
            }
            
            .page-header, .content-section {
                padding: 16px;
            }
            
            .header-title h1 {
                font-size: 20px;
                word-wrap: break-word;
                max-width: 100%;
            }
            
            .header-top {
                flex-direction: column;
                align-items: flex-start;
                gap: 12px;
            }
            
            .btn-voltar {
                width: 100%;
                justify-content: center;
            }
            
            .tabs-container {
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
                scrollbar-width: none;
                -ms-overflow-style: none;
            }
            
            .tabs-container::-webkit-scrollbar {
                display: none;
            }
            
            .tab-btn {
                padding: 10px 16px;
                font-size: 13px;
                white-space: nowrap;
                min-width: fit-content;
            }
            
            .item-header {
                flex-direction: column;
                align-items: stretch;
                gap: 12px;
            }
            
            .item-actions-container {
                flex-direction: column !important;
                width: 100% !important;
            }
            
            .item-action {
                padding: 10px 16px;
                font-size: 12px;
                white-space: nowrap;
                width: 100% !important;
                justify-content: center;
                display: flex !important;
                align-items: center;
                gap: 6px;
            }
            
            .item-action .btn-text {
                font-size: 12px;
            }
            
            .item-title {
                font-size: 16px;
                word-wrap: break-word;
                overflow-wrap: break-word;
                max-width: 100%;
            }
            
            .status-badge {
                font-size: 11px;
                padding: 4px 8px;
            }
            
            .item-details {
                grid-template-columns: 1fr;
                font-size: 13px;
            }
            
            .links-grid {
                grid-template-columns: 1fr;
            }
            
            .link-card-input-group {
                flex-direction: column;
                width: 100% !important;
            }
            
            .link-card-input-group input {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                word-wrap: break-word;
                overflow-wrap: break-word;
            }
            
            .link-card-btn {
                width: 100% !important;
                justify-content: center;
                white-space: normal;
                word-wrap: break-word;
            }
            
            /* Garantir que texto dentro dos cards não corte - mobile */
            .link-card-title,
            .link-card-subtitle,
            .link-card-description {
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                max-width: 100% !important;
                white-space: normal !important;
                hyphens: auto;
            }
            
            /* Títulos específicos */
            .link-card-title {
                font-size: 16px !important;
                line-height: 1.4 !important;
            }
            
            .link-card-subtitle {
                font-size: 12px !important;
                line-height: 1.5 !important;
            }
            
            .link-card-description {
                font-size: 13px !important;
                line-height: 1.6 !important;
            }
            
            /* Ajustar grupos de input de link no mobile */
            .cadastro-link-input-group {
                flex-direction: column !important;
                gap: 12px !important;
            }
            
            .cadastro-link-input-group input {
                width: 100% !important;
                min-width: 0 !important;
                word-break: break-all !important;
                overflow-wrap: break-word !important;
            }
            
            .cadastro-link-copy-btn {
                width: 100% !important;
                justify-content: center !important;
            }
            
            /* Garantir que botão "Criar Novo Link Personalizado" não corte */
            .link-card button[onclick*="showCreateMultipleCadastroLinksModal"] {
                white-space: normal !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                padding: 12px 16px !important;
                font-size: 13px !important;
                line-height: 1.4 !important;
                text-align: center !important;
                width: 100% !important;
                box-sizing: border-box !important;
                width: 100% !important;
                min-height: auto !important;
            }
            
            /* Garantir que todos os botões dentro de link-card não cortem */
            .link-card button {
                white-space: normal !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
            }
            
            /* Texto "Ilimitado" não cortar */
            code, .countdown-text {
                word-break: break-word !important;
                overflow-wrap: break-word !important;
                white-space: normal !important;
            }
            
            .stats-hero-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
            }
            
            .stat-hero-value {
                font-size: 24px;
            }
            
            .stat-hero-label {
                font-size: 12px;
            }
            
            .search-bar {
                flex-direction: column;
            }
            
            .search-input {
                width: 100%;
                min-width: unset;
            }
            
            .btn-export {
                width: 100%;
                justify-content: center;
            }
            
            /* REMOVER COMPLETAMENTE rolagem interna e margens pretas */
            .links-hero-section {
                /* SEM rolagem interna - TOTALMENTE REMOVIDA */
                max-height: none !important;
                height: auto !important;
                min-height: auto !important;
                overflow-y: visible !important;
                overflow-x: hidden !important;
                -webkit-overflow-scrolling: auto !important;
                -ms-overflow-style: none !important;
                scrollbar-width: none !important;
                /* Ocupar TODA largura - SEM margens pretas nas laterais */
                width: 100vw !important;
                max-width: 100vw !important;
                margin: 0 !important;
                padding: 8px 0 !important;
                padding-left: 0 !important;
                padding-right: 0 !important;
                box-sizing: border-box !important;
                background: linear-gradient(135deg, rgba(255,199,0,0.1) 0%, rgba(255,165,0,0.05) 100%) !important;
                border-left: none !important;
                border-right: none !important;
                position: relative !important;
                /* Forçar remoção de scrollbar em TODOS os navegadores */
                -webkit-appearance: none !important;
                -moz-appearance: none !important;
                appearance: none !important;
            }
            
            /* Remover scrollbar visualmente - TOTALMENTE - TODAS AS VARIA—.ES */
            .links-hero-section::-webkit-scrollbar {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
                opacity: 0 !important;
                background: transparent !important;
            }
            
            .links-hero-section::-webkit-scrollbar-track {
                display: none !important;
                width: 0 !important;
                background: transparent !important;
            }
            
            .links-hero-section::-webkit-scrollbar-thumb {
                display: none !important;
                width: 0 !important;
                background: transparent !important;
            }
            
            /* Garantir que elementos dentro não tenham scroll ou margens */
            .links-hero-section * {
                max-height: none !important;
                overflow-y: visible !important;
                overflow-x: hidden !important;
            }
            
            /* Remover margens internas dos cards */
            .links-hero-title {
                margin: 0 0 12px 0 !important;
                padding: 0 4px !important;
            }
            
            .links-hero-title h2 {
                font-size: 16px !important;
                word-wrap: break-word !important;
                margin: 0 !important;
            }
            
            .links-grid {
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 4px !important;
                gap: 10px !important;
                box-sizing: border-box !important;
            }
            
            .link-card {
                width: calc(100% - 0px) !important;
                max-width: 100% !important;
                margin: 0 0 10px 0 !important;
                padding: 10px 6px !important;
                box-sizing: border-box !important;
                overflow: visible !important;
                overflow-x: hidden !important;
                overflow-y: visible !important;
                max-height: none !important;
                height: auto !important;
            }
            
            /* Garantir que todos os elementos dentro do card não causem overflow - AGRESSIVO */
            .link-card * {
                max-width: 100% !important;
                box-sizing: border-box !important;
            }
            
            /* Ajustar ESPECIFICAMENTE elementos que podem causar overflow */
            .link-card button,
            .link-card input,
            .link-card .link-card-input-group,
            .link-card .link-card-btn,
            .link-card p,
            .link-card div[style*="display: flex"] {
                max-width: 100% !important;
                box-sizing: border-box !important;
                width: 100% !important;
            }
            
            /* Garantir que botões dentro de cards NÃO ultrapassem o card */
            .link-card button {
                max-width: calc(100% - 0px) !important;
                width: 100% !important;
            }
            
            /* Garantir que textos dentro dos cards não cortem */
            .link-card-title,
            .link-card-subtitle,
            .link-card-description {
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                max-width: 100% !important;
                white-space: normal !important;
                font-size: 13px !important;
                line-height: 1.4 !important;
            }
            
            .link-card-title {
                font-size: 15px !important;
            }
            
            .link-card-subtitle {
                font-size: 11px !important;
            }
            
            /* Garantir que content-section ocupe toda altura e role - MAS NÃO links-hero-section */
            .content-section {
                max-height: calc(100vh - 180px) !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
                padding: 12px 0 !important;
                padding-left: 0 !important;
                padding-right: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                -webkit-overflow-scrolling: touch !important;
                /* Garantir que links-hero-section dentro NÃO role */
            }
            
            /* IMPORTANTE: links-hero-section DENTRO de content-section NÃO DEVE ROLAR */
            .content-section .links-hero-section {
                overflow-y: visible !important;
                max-height: none !important;
                height: auto !important;
            }
            
            
            /* Botões menores e mais bonitos no mobile - AJUSTADOS PARA NÃO CORTAR */
            .link-card button {
                padding: 8px 8px !important;
                font-size: 11px !important;
                min-height: 36px !important;
                line-height: 1.3 !important;
                width: calc(100% - 0px) !important;
                max-width: 100% !important;
                white-space: normal !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                text-align: center !important;
                box-sizing: border-box !important;
            }
            
            /* Botão "Criar Novo Link Personalizado" - NÃO CORTAR TEXTO */
            .link-card button[onclick*="showCreateMultipleCadastroLinksModal"] {
                padding: 10px 8px !important;
                font-size: 11px !important;
                min-height: 40px !important;
                width: calc(100% - 0px) !important;
                max-width: 100% !important;
                white-space: normal !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                text-align: center !important;
                box-sizing: border-box !important;
            }
            
            /* Botões dentro dos cards de links personalizados */
            button[onclick*="copyCadastroLink"],
            button[onclick*="editCadastroLink"],
            button[onclick*="deleteCadastroLink"],
            button[onclick*="toggleActiveCadastroLink"],
            button[onclick*="renewCadastroLink"] {
                padding: 6px 10px !important;
                font-size: 11px !important;
                min-height: 32px !important;
            }
            
            /* Ícones menores nos botões */
            .link-card button i {
                font-size: 11px !important;
            }
            
            /* Remover qualquer espaço preto abaixo ou bordas pretas */
            .links-hero-section::after,
            .links-hero-section::before {
                display: none !important;
                content: none !important;
            }
            
            /* Garantir que inputs de URL não cortem - MOBILE */
            input[type="text"][id*="cadastro-link-input"],
            input[type="text"][id*="link"],
            input[type="text"][id*="portaria"],
            input[type="text"][id*="portaria-slug-input"] {
                font-size: 11px !important;
                word-break: break-all !important;
                overflow-wrap: anywhere !important;
                white-space: normal !important;
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                padding: 10px 10px !important;
                overflow-x: auto !important;
                -webkit-overflow-scrolling: touch !important;
            }
            
            /* Ajustar link-card-input-group no mobile */
            .link-card-input-group {
                flex-direction: column !important;
                gap: 8px !important;
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }
            
            .link-card-input-group input {
                width: calc(100% - 0px) !important;
                min-width: 0 !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                padding: 10px 8px !important;
            }
            
            .link-card-input-group button,
            .link-card-btn {
                width: calc(100% - 0px) !important;
                max-width: 100% !important;
                white-space: normal !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                box-sizing: border-box !important;
                min-width: 0 !important;
                padding: 10px 8px !important;
                font-size: 11px !important;
                text-align: center !important;
                line-height: 1.4 !important;
            }
            
            /* Garantir que botão "Copiar Link Personalizado" não corte */
            .link-card-btn[style*="Copiar Link Personalizado"],
            button[onclick*="link-portaria-personalizado"] {
                white-space: normal !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                padding: 10px 8px !important;
                font-size: 11px !important;
            }
            
            /* Ajustar div flex com inputs e botões no mobile (ex: slug personalizado) */
            div[style*="display: flex"][style*="align-items: stretch"],
            div[style*="display: flex"][style*="gap: 8px"] {
                flex-direction: column !important;
                width: 100% !important;
                max-width: 100% !important;
                gap: 8px !important;
                box-sizing: border-box !important;
            }
            
            div[style*="display: flex"][style*="align-items: stretch"] input,
            div[style*="display: flex"][style*="align-items: stretch"] button,
            div[style*="display: flex"][style*="gap: 8px"] input,
            div[style*="display: flex"][style*="gap: 8px"] button {
                width: 100% !important;
                max-width: 100% !important;
                white-space: normal !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                box-sizing: border-box !important;
                flex: none !important;
            }
            
            /* Garantir que seção de personalização de slug não corte */
            div[style*="margin-top: 12px"][style*="padding: 12px"] {
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                overflow: visible !important;
            }
            
            div[style*="margin-top: 12px"][style*="padding: 12px"] * {
                max-width: 100% !important;
                box-sizing: border-box !important;
            }
            
            /* Ajustar botões de ação nos cards de links personalizados */
            #cadastro-links-list button,
            #cadastro-links-list .item-actions-container button {
                width: 100% !important;
                white-space: normal !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                box-sizing: border-box !important;
                margin: 4px 0 !important;
            }
            
            /* Container de ações deve ser flex column no mobile */
            #cadastro-links-list .item-actions-container {
                flex-direction: column !important;
                gap: 8px !important;
                width: 100% !important;
            }
            
            /* Remover espaços vazios que podem aparecer como "preto" */
            .stats-hero-section:empty,
            .stats-grid:empty,
            #stats-hero-section:empty,
            #stats-grid:empty {
                display: none !important;
                height: 0 !important;
                padding: 0 !important;
                margin: 0 !important;
            }
            
            /* Garantir que stats-hero-section não ocupe espaço quando escondido */
            #stats-hero-section[style*="display: none"] {
                display: none !important;
                height: 0 !important;
                padding: 0 !important;
                margin: 0 !important;
                visibility: hidden !important;
            }
            
            /* Ajustar modal de PDF no mobile */
            .pdf-settings-content,
            #pdf-settings-content,
            #pdf-settings-container {
                padding: 16px !important;
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box;
            }
            
            .pdf-settings-content .form-group,
            #pdf-settings-content .form-group,
            #pdf-settings-container .form-group {
                margin-bottom: 16px;
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box;
            }
            
            #pdf-settings-container input,
            #pdf-settings-container button,
            #pdf-settings-container select,
            #pdf-settings-container textarea {
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box;
                word-wrap: break-word;
                overflow-wrap: break-word;
            }
            
            #pdf-settings-container .color-input-group,
            #pdf-settings-container .input-group {
                flex-direction: column !important;
                width: 100% !important;
                gap: 12px !important;
            }
            
            #pdf-settings-container .btn-group {
                flex-direction: column !important;
                width: 100% !important;
                gap: 12px !important;
            }
            
            #pdf-settings-container .btn-group button {
                width: 100% !important;
            }
            
            /* Ajustar cards dentro do PDF - deixar mais organizados como portaria */
            #pdf-settings-container .pdf-settings-card,
            #pdf-settings-container [style*="background: rgba(0,0,0,0.2)"] {
                padding: 16px !important;
                margin-bottom: 16px !important;
                border-radius: 12px !important;
            }
            
            /* Botões menores no mobile */
            #pdf-settings-container button {
                padding: 10px 16px !important;
                font-size: 13px !important;
            }
            
            /* Inputs organizados */
            #pdf-settings-container [style*="display: flex; align-items: center; gap: 12px;"] {
                flex-direction: column !important;
                align-items: stretch !important;
                gap: 12px !important;
            }
            
            #pdf-settings-container [style*="display: flex; align-items: center; gap: 12px;"] > * {
                width: 100% !important;
            }
            
            /* Input de cor e texto lado a lado quando possível */
            #pdf-settings-container input[type="color"] {
                width: 80px !important;
                height: 45px !important;
                flex-shrink: 0;
            }
            
            #pdf-settings-container input[type="text"][id*="color"] {
                flex: 1 !important;
                max-width: 100% !important;
            }
            
            /* Remover max-width que limita inputs */
            #pdf-settings-container input[style*="max-width: 130px"] {
                max-width: 100% !important;
            }
        }
    </style>
    @vite(['resources/js/pages/responsesList.js'])
</head>
<body>
    <div class="page-container">
        <div class="page-header">
            <div class="header-top">
                <div class="header-title">
                    <i class="fas fa-users" style="font-size: 2rem; color: #FFC700;"></i>
                    <h1 id="page-title">Confirmação de Check-in</h1>
                </div>
                <a href="#" id="btn-voltar" class="btn-voltar" onclick="event.preventDefault(); return false;">
                    <i class="fas fa-arrow-left"></i> Voltar
                </a>
            </div>
            
            <div class="tabs-container" id="tabs-container">
                <!-- Tabs serão inseridas via JavaScript -->
            </div>
        </div>
        
        <div class="content-section">
            <div id="loading" class="loading">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 16px;"></i>
                <div>Carregando dados...</div>
            </div>
            
            <div id="content" style="display: none;">
                <!-- SE—fO DE LINKS GRANDE E VISÍVEL (apenas para modo lista de convidados) -->
                <div id="links-hero-section" class="links-hero-section" style="display: none;">
                    <div class="links-hero-title">
                        <i class="fas fa-link"></i>
                        <h2>Links para Compartilhar</h2>
                    </div>
                    <div class="links-grid">
                        <!-- Link para Cadastro -->
                        <div class="link-card cadastro">
                            <div class="link-card-header">
                                <div class="link-card-icon cadastro">
                                    <i class="fas fa-user-plus"></i>
                                </div>
                                <div>
                                    <h3 class="link-card-title">Links de Cadastro Personalizados</h3>
                                    <p class="link-card-subtitle">Crie e gerencie links personalizados para cadastro</p>
                                </div>
                            </div>
                            <p class="link-card-description">
                                <strong>Crie links personalizados para as pessoas se inscreverem.</strong><br>
                                Cada link pode ter sua própria descrição, validade e limite de usos.
                            </p>
                            
                            <!-- Botão Criar Múltiplos Links -->
                            <button onclick="showCreateMultipleCadastroLinksModal()" 
                                    style="margin-top: 20px; width: 100%; padding: 14px 24px; background: #000; border: 2px solid #43e97b; border-radius: 10px; color: #43e97b; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.3s; white-space: normal; word-wrap: break-word; overflow-wrap: break-word; box-sizing: border-box;"
                                    onmouseover="this.style.background='#43e97b'; this.style.color='#000';"
                                    onmouseout="this.style.background='#000'; this.style.color='#43e97b';">
                                <i class="fas fa-plus-circle"></i> Criar Novo Link Personalizado
                            </button>
                            
                            <!-- Lista de Links Personalizados Criados -->
                            <div id="cadastro-links-list" style="margin-top: 20px;">
                                <!-- Links personalizados serão inseridos aqui via JavaScript -->
                            </div>
                        </div>
                        
                        <!-- Link para Portaria -->
                        <div class="link-card portaria">
                            <div class="link-card-header">
                                <div class="link-card-icon portaria">
                                    <i class="fas fa-door-open"></i>
                                </div>
                                <div>
                                    <h3 class="link-card-title">Link da Portaria</h3>
                                    <p class="link-card-subtitle">Para confirmar chegada dos convidados</p>
                                </div>
                            </div>
                            <p class="link-card-description">
                                <strong>Envie este link para o porteiro/recepcionista.</strong><br>
                                Ele poderá ver a lista completa, buscar por nome, confirmar a chegada e ver estatísticas em tempo real.
                            </p>
                            <!-- Link Original (oculto quando slug personalizado estiver ativo) -->
                            <div class="link-card-input-group" id="link-portaria-original-group">
                                <input type="text" id="link-portaria" readonly placeholder="Carregando link...">
                                <button class="link-card-btn portaria" onclick="copyLinkToClipboard('link-portaria', event)">
                                    <i class="fas fa-copy"></i> Copiar Link
                                </button>
                            </div>
                            
                            <!-- Link Personalizado (visível apenas quando slug estiver ativo) -->
                            <div class="link-card-input-group" id="link-portaria-personalizado-group" style="display: none; margin-bottom: 12px;">
                                <input type="text" id="link-portaria-personalizado" readonly placeholder="Link personalizado...">
                                <button class="link-card-btn portaria" onclick="copyLinkToClipboard('link-portaria-personalizado', event)" style="background: linear-gradient(135deg, #FFC700, #FFA500); white-space: normal; word-wrap: break-word; overflow-wrap: break-word;">
                                    <i class="fas fa-copy"></i> Copiar Link Personalizado
                                </button>
                            </div>
                            
                            <div style="margin-top: 12px; padding: 12px; background: rgba(74,144,226,0.1); border-radius: 8px; border: 1px solid rgba(74,144,226,0.3);">
                                <label style="display: block; color: #ECECEC; margin-bottom: 8px; font-weight: 600; font-size: 13px;">
                                    <i class="fas fa-link"></i> Personalizar Link (Slug)
                                </label>
                                <div style="display: flex; gap: 8px; align-items: stretch; width: 100%; max-width: 100%; box-sizing: border-box;">
                                    <input type="text" id="portaria-slug-input" 
                                           placeholder="Ex: portaria-2026, conecta-portaria" 
                                           style="flex: 1; padding: 10px 12px; background: rgba(255,255,255,0.05); border: 2px solid rgba(74,144,226,0.3); border-radius: 8px; color: #ECECEC; font-size: 13px; min-width: 0; max-width: 100%; box-sizing: border-box; word-break: break-all; overflow-wrap: anywhere;"
                                           pattern="[a-z0-9_-]+" 
                                           title="Apenas letras minúsculas, números, hífens e underscores">
                                    <button onclick="savePortariaSlug(event)" 
                                            style="padding: 10px 20px; background: linear-gradient(135deg, #4A90E2, #357ABD); border: none; border-radius: 8px; color: #fff; font-weight: 600; cursor: pointer; white-space: normal; word-wrap: break-word; overflow-wrap: break-word; box-sizing: border-box;">
                                        <i class="fas fa-save"></i> Salvar
                                    </button>
                                    <button onclick="clearPortariaSlug()" 
                                            style="padding: 10px 14px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #ECECEC; cursor: pointer; font-weight: 600; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                                <p style="color: #A1A1A1; font-size: 11px; margin-top: 8px; line-height: 1.4;">
                                    <i class="fas fa-info-circle"></i> Crie um link curto e fácil de compartilhar. Ex: "portaria-2026" criará o link: <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">/portaria/portaria-2026</code>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Estatísticas Melhoradas (Removido contador de contratos conforme solicitado) -->
                <div id="stats-hero-section" class="stats-hero-grid" style="display: none;">
                    <div class="stat-hero-card total">
                        <div class="stat-hero-icon total">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="stat-hero-value total" id="stat-total">0</div>
                        <div class="stat-hero-label">Cadastrados</div>
                    </div>
                    <div class="stat-hero-card falta">
                        <div class="stat-hero-icon falta">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="stat-hero-value falta" id="stat-falta">0</div>
                        <div class="stat-hero-label">Não Chegou</div>
                    </div>
                    <div class="stat-hero-card chegou">
                        <div class="stat-hero-icon chegou">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="stat-hero-value chegou" id="stat-chegou">0</div>
                        <div class="stat-hero-label">Chegou</div>
                    </div>
                </div>
                
                <div class="stats-grid" id="stats-grid">
                    <!-- Estatísticas serão inseridas via JavaScript -->
                </div>
                
                <div class="search-bar">
                    <input type="text" id="search-input" class="search-input" placeholder="Buscar por nome, WhatsApp, email...">
                    <button id="export-pdf" class="btn-export pdf">
                        <i class="fas fa-file-pdf"></i> PDF
                    </button>
                    <button id="export-csv" class="btn-export csv" style="display: none;">
                        <i class="fas fa-file-csv"></i> CSV
                    </button>
                </div>
                
                <!-- Controles Administrativos -->
                <div id="admin-controls" class="admin-controls" style="display: none;">
                    <div class="admin-controls-left">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #ECECEC; font-weight: 600;">
                            <input type="checkbox" id="select-all-checkbox" class="guest-checkbox">
                            Selecionar Todos
                        </label>
                    </div>
                    <div class="admin-controls-right">
                        <button class="btn-delete-admin" id="delete-selected-btn" style="display: none;">
                            <i class="fas fa-trash-alt"></i> Excluir Selecionados (<span id="selected-count">0</span>)
                        </button>
                        <button class="btn-delete-admin" id="delete-all-btn">
                            <i class="fas fa-trash"></i> Excluir Todos
                        </button>
                    </div>
                </div>
                
                <div class="items-list" id="items-list">
                    <!-- Itens serão inseridos via JavaScript -->
                </div>
            </div>
            
            <div id="empty" class="empty-state" style="display: none;">
                <div class="empty-icon">
                    <i class="fas fa-inbox"></i>
                </div>
                <h3 class="empty-title">Nenhum dado ainda</h3>
                <p class="empty-text">Os dados aparecerão aqui quando disponíveis</p>
            </div>
        </div>
    </div>
    
    
    <script src="/config.js?v=2026-09-09-vite1"></script>
</body>
</html>

