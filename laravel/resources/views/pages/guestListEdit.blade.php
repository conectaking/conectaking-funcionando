<!DOCTYPE html>
<html lang="pt-BR" class="form-edit-page-html guest-list-mode">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Editar Lista de Convidados - King Forms</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="apple-touch-icon" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="stylesheet" href="/vendor/fontawesome/css/all.min.css">
    <script src="/config.js?v=2026-09-09-vite1"></script>
    <!-- IMPORTAR TODOS OS ESTILOS DO FORM EDIT -->
    <style>
        
        .tabs-container {
            display: flex;
            gap: 8px;
            margin-bottom: 24px;
            border-bottom: 2px solid var(--border-color, #2C2C2F);
        }
        
        .tab-button {
            padding: 12px 24px;
            background: transparent;
            border: none;
            color: var(--text-dark, #A1A1A1);
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            border-bottom: 3px solid transparent;
            transition: all 0.3s;
            position: relative;
            top: 2px;
        }
        
        .tab-button.active {
            color: var(--dourado-principal, #FFC700);
            border-bottom-color: var(--dourado-principal, #FFC700);
        }
        
        .tab-button:hover {
            color: var(--text, #ECECEC);
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
            animation: fadeIn 0.3s;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .stats-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 32px;
        }
        
        .stat-card {
            background: var(--card-background-color, #1C1C21);
            border: 1px solid var(--border-color, #2C2C2F);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
        }
        
        .stat-card .stat-value {
            font-size: 32px;
            font-weight: 800;
            color: var(--dourado-principal, #FFC700);
            margin: 8px 0;
        }
        
        .stat-card .stat-label {
            color: var(--text-dark, #A1A1A1);
            font-size: 14px;
        }
        
        .guests-table {
            background: var(--card-background-color, #1C1C21);
            border: 1px solid var(--border-color, #2C2C2F);
            border-radius: 12px;
            overflow: hidden;
        }
        
        .table-header {
            background: var(--border-color, #2C2C2F);
            padding: 16px;
            display: grid;
            grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr 0.5fr;
            gap: 16px;
            font-weight: 600;
            color: var(--text, #ECECEC);
        }
        
        .table-row {
            padding: 16px;
            display: grid;
            grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr 0.5fr;
            gap: 16px;
            border-bottom: 1px solid var(--border-color, #2C2C2F);
            align-items: center;
        }
        
        .table-row:last-child {
            border-bottom: none;
        }
        
        .table-row:hover {
            background: rgba(255, 199, 0, 0.05);
        }
        
        .status-badge {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
        }
        
        .status-registered {
            background: rgba(74, 144, 226, 0.2);
            color: #4A90E2;
        }
        
        .status-confirmed {
            background: rgba(255, 199, 0, 0.2);
            color: #FFC700;
        }
        
        .status-checked_in {
            background: rgba(37, 211, 102, 0.2);
            color: #25D366;
        }
        
        .status-cancelled {
            background: rgba(255, 68, 68, 0.2);
            color: #ff4444;
        }
        
        .btn-icon {
            padding: 8px;
            background: transparent;
            border: 1px solid var(--border-color, #2C2C2F);
            color: var(--text, #ECECEC);
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .btn-icon:hover {
            background: var(--dourado-principal, #FFC700);
            color: #000;
            border-color: var(--dourado-principal, #FFC700);
        }
        
        .link-section {
            background: var(--card-background-color, #1C1C21);
            border: 1px solid var(--border-color, #2C2C2F);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
            overflow: visible;
            width: 100%;
            box-sizing: border-box;
        }
        
        #personalized-links-list {
            width: 100%;
            overflow: visible;
            box-sizing: border-box;
        }
        
        .personalized-link-item {
            width: 100%;
            box-sizing: border-box;
            overflow: visible;
            display: block;
            padding: 16px;
            margin-bottom: 16px;
            background: var(--card-background-color, #1C1C21);
            border: 1px solid var(--border-color, #2C2C2F);
            border-radius: 12px;
        }
        
        /* Desktop: Botão Criar Novo Link */
        .btn-create-link {
            max-width: 300px;
        }
        
        /* Desktop: Links personalizados */
        @media (min-width: 769px) {
            .personalized-link-item {
                padding: 20px;
            }
            
            .link-actions-content {
                flex-direction: row !important;
                justify-content: flex-end !important;
                gap: 8px !important;
            }
            
            .link-actions-content button {
                flex: 0 0 auto !important;
                min-width: 100px !important;
                width: auto !important;
                padding: 10px 18px !important;
            }
            
            .link-box-content {
                flex-direction: row !important;
            }
            
            .link-input-content {
                flex: 1 !important;
                min-width: 300px !important;
                width: auto !important;
            }
            
            .btn-copy-content {
                width: auto !important;
                flex-shrink: 0 !important;
            }
        }
        
        /* Estilos base para links personalizados - Desktop */
        .link-header-content {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 16px;
            flex-wrap: wrap;
            width: 100%;
        }
        
        .link-name-content {
            color: var(--text, #ECECEC);
            font-size: 16px;
            font-weight: 700;
            flex: 1;
            min-width: 0;
            word-break: break-word;
            overflow-wrap: break-word;
            line-height: 1.4;
            display: block;
        }
        
        .link-box-content {
            display: flex;
            gap: 12px;
            align-items: stretch;
            margin-bottom: 16px;
            flex-wrap: wrap;
            width: 100%;
        }
        
        .link-input-content {
            flex: 1;
            min-width: 200px;
            width: 100%;
            max-width: 100%;
            padding: 14px 16px;
            background: var(--background-color, #0D0D0F);
            border: 2px solid var(--border-color, #2C2C2F);
            border-radius: 12px;
            color: var(--text, #ECECEC);
            font-size: 13px;
            font-family: monospace;
            word-break: break-all;
            overflow-wrap: break-word;
            box-sizing: border-box;
            display: block;
        }
        
        .btn-copy-content {
            padding: 14px 24px;
            background: linear-gradient(135deg, #FFC700, #FFA500);
            color: #000;
            border: none;
            border-radius: 12px;
            font-weight: 700;
            cursor: pointer;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
        }
        
        .link-details-content {
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
            margin-bottom: 16px;
            padding: 12px;
            background: rgba(0,0,0,0.2);
            border-radius: 8px;
            font-size: 13px;
            color: var(--text-dark, #A1A1A1);
            width: 100%;
            box-sizing: border-box;
        }
        
        .detail-item-content {
            display: flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
            flex-wrap: wrap;
        }
        
        .detail-item-content i {
            color: var(--dourado-principal, #FFC700);
            flex-shrink: 0;
        }
        
        .detail-item-content strong {
            color: var(--text, #ECECEC);
        }
        
        .link-actions-content {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            justify-content: flex-end;
            width: 100%;
        }
        
        .btn-action-content {
            padding: 10px 20px;
            border-radius: 10px;
            font-weight: 700;
            cursor: pointer;
            font-size: 13px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
            flex-shrink: 0;
            transition: all 0.3s;
        }
        
        .link-section h3 {
            margin: 0 0 16px 0;
            color: var(--dourado-principal, #FFC700);
        }
        
        .link-box {
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
        }
        
        .link-input {
            flex: 1;
            padding: 12px;
            background: var(--background-color, #0D0D0F);
            border: 1px solid var(--border-color, #2C2C2F);
            border-radius: 8px;
            color: var(--text, #ECECEC);
            font-family: monospace;
            font-size: 14px;
            word-break: break-all;
            min-width: 0;
        }
        
        .tab-label {
            display: inline;
        }
        
        .tab-count {
            display: inline;
            font-weight: 700;
        }
        
        .guest-list-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px;
            background: var(--card-background-color, #1C1C21);
            border-bottom: 1px solid var(--border-color, #2C2C2F);
        }
        
        .main-container {
            padding: 24px;
            max-width: 1400px;
            margin: 0 auto;
            overflow: visible;
            width: 100%;
            box-sizing: border-box;
        }
        
        .tab-content {
            overflow: visible !important;
            width: 100% !important;
            box-sizing: border-box !important;
        }
        
        #tab-links {
            overflow: visible !important;
            width: 100% !important;
            box-sizing: border-box !important;
        }
        
        .btn-copy {
            padding: 12px 20px;
            background: var(--dourado-principal, #FFC700);
            color: #000;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
        }
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: var(--text-dark, #A1A1A1);
        }
        
        .empty-state i {
            font-size: 64px;
            margin-bottom: 16px;
            opacity: 0.3;
        }
        
        /* Modais */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            overflow-y: auto;
            padding: 20px;
        }
        
        .modal.active {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .modal-content {
            background: var(--card-background-color, #1C1C21);
            border-radius: 12px;
            max-width: 800px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px;
            border-bottom: 2px solid var(--border-color, #2C2C2F);
        }
        
        .modal-header h2 {
            margin: 0;
            color: var(--dourado-principal, #FFC700);
        }
        
        .close-modal {
            background: transparent;
            border: none;
            color: var(--text, #ECECEC);
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.3s;
        }
        
        .close-modal:hover {
            background: rgba(255, 68, 68, 0.2);
            color: #ff4444;
        }
        
        .modal-info {
            padding: 24px;
        }
        
        .info-row {
            display: flex;
            padding: 16px 0;
            border-bottom: 1px solid var(--border-color, #2C2C2F);
        }
        
        .info-row:last-child {
            border-bottom: none;
        }
        
        .info-label {
            font-weight: 600;
            color: var(--text-dark, #A1A1A1);
            min-width: 150px;
        }
        
        .info-value {
            color: var(--text, #ECECEC);
            flex: 1;
        }
        
        /* Modal de Campos Customizados */
        .custom-fields-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            z-index: 10001;
            overflow-y: auto;
            padding: 20px;
        }
        
        .custom-fields-modal.active {
            display: block;
        }
        
        .custom-fields-content {
            background: var(--card-background-color, #1C1C21);
            border-radius: 12px;
            max-width: 900px;
            width: 100%;
            margin: 40px auto;
            max-height: calc(100vh - 80px);
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
        }
        
        .custom-fields-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px;
            border-bottom: 2px solid var(--border-color, #2C2C2F);
            position: sticky;
            top: 0;
            background: var(--card-background-color, #1C1C21);
            z-index: 10;
        }
        
        .custom-fields-header h2 {
            margin: 0;
            color: var(--dourado-principal, #FFC700);
        }
        
        #custom-fields-editor {
            padding: 24px;
            max-height: calc(90vh - 200px);
            overflow-y: auto;
        }
        
        /* Scrollbar personalizada */
        ::-webkit-scrollbar {
            width: 10px;
            height: 10px;
        }
        
        ::-webkit-scrollbar-track {
            background: var(--background-color, #0D0D0F);
        }
        
        ::-webkit-scrollbar-thumb {
            background: var(--border-color, #2C2C2F);
            border-radius: 5px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
            background: var(--dourado-principal, #FFC700);
        }
        
        /* Mobile Responsive */
        @media (max-width: 768px) {
            .guest-list-header {
                padding: 16px;
                flex-wrap: wrap;
            }
            
            .guest-list-header h1 {
                font-size: 18px;
                width: 100%;
                margin-bottom: 12px;
            }
            
            .header-actions {
                width: 100%;
                flex-wrap: wrap;
                gap: 8px;
            }
            
            .header-actions .btn {
                flex: 1;
                min-width: 120px;
                padding: 10px 16px;
                font-size: 14px;
            }
            
            .main-container {
                padding: 16px;
            }
            
            .tabs-container {
                overflow-x: auto;
                flex-wrap: nowrap;
                -webkit-overflow-scrolling: touch;
            }
            
            .tab-button {
                padding: 10px 16px;
                font-size: 14px;
                white-space: nowrap;
            }
            
            .tab-label {
                display: none;
            }
            
            .tab-button i {
                margin-right: 0;
            }
            
            .table-header,
            .table-row {
                grid-template-columns: 1fr;
                gap: 8px;
                padding: 12px;
            }
            
            .table-header > div,
            .table-row > div {
                padding: 8px 0;
                border-bottom: 1px solid var(--border-color, #2C2C2F);
            }
            
            .table-header > div:last-child,
            .table-row > div:last-child {
                border-bottom: none;
            }
            
            .stats-cards {
                grid-template-columns: 1fr;
            }
            
            .link-section {
                padding: 16px;
            }
            
            .link-box {
                flex-direction: column;
                gap: 12px;
            }
            
            .link-input {
                font-size: 12px;
                word-break: break-all;
                padding: 10px 12px;
                width: 100%;
                min-width: 0;
            }
            
            .btn-copy {
                width: 100%;
            }
            
            .link-section {
                padding: 16px;
            }
            
            .link-section h3, .link-section h4 {
                font-size: 16px;
                margin-bottom: 12px;
            }
            
            .link-section p {
                font-size: 13px;
                margin-bottom: 12px;
            }
            
            .personalized-link-item {
                padding: 16px !important;
                overflow: visible !important;
                width: 100%;
                box-sizing: border-box;
            }
            
            .personalized-link-item > div {
                width: 100% !important;
                box-sizing: border-box;
            }
            
            .personalized-link-item .link-box {
                flex-direction: column;
                width: 100%;
            }
            
            .personalized-link-item .link-input {
                width: 100% !important;
                min-width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box;
                overflow: visible;
                word-break: break-all;
            }
            
            .personalized-link-item .btn-copy {
                width: 100%;
                justify-content: center;
            }
            
            .personalized-link-item strong {
                font-size: 14px !important;
                width: 100%;
                word-break: break-word;
                overflow-wrap: break-word;
            }
            
            .personalized-link-item > div:last-child {
                flex-direction: column;
                width: 100%;
                gap: 8px;
            }
            
            .personalized-link-item .btn-action-toggle,
            .personalized-link-item .btn-action-renew,
            .personalized-link-item .btn-action-edit,
            .personalized-link-item .btn-action-delete {
                width: 100% !important;
                flex: 1 1 100% !important;
                min-width: 100% !important;
                justify-content: center;
            }
            
            .btn-text {
                display: inline;
            }
            
            /* Botão Criar Novo Link - Mobile */
            .btn-create-link {
                width: 100% !important;
                max-width: 100% !important;
                padding: 10px 16px !important;
                font-size: 13px !important;
            }
            
            /* Links personalizados - Mobile */
            .personalized-link-item {
                padding: 12px !important;
                margin-bottom: 12px !important;
            }
            
            #personalized-links-list {
                width: 100% !important;
                overflow: visible !important;
                box-sizing: border-box !important;
                max-width: 100% !important;
            }
            
            /* Link da Portaria - Mobile */
            #portaria-link-section {
                margin-top: 16px !important;
                padding: 16px !important;
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
            
            /* Garantir que portaria não desaparea */
            #tab-links .link-section {
                min-height: auto !important;
                overflow: visible !important;
            }
            
            /* Ajustar padding dos links personalizados no mobile */
            #personalized-links-list .personalized-link-item {
                padding: 12px !important;
                margin-bottom: 12px !important;
            }
            
            /* Ajustes específicos para links personalizados no mobile - CONSOLIDADO */
            .personalized-link-item {
                padding: 16px !important;
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                overflow: visible !important;
            }
            
            .personalized-link-item * {
                box-sizing: border-box !important;
            }
            
            /* Header: Status e Nome */
            .personalized-link-item .link-header-mobile,
            .personalized-link-item > div:first-of-type {
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                width: 100% !important;
                flex-wrap: wrap !important;
                align-items: flex-start !important;
                gap: 12px !important;
                margin-bottom: 16px !important;
            }
            
            .personalized-link-item .status-badge {
                font-size: 12px !important;
                padding: 6px 10px !important;
                display: inline-block !important;
                visibility: visible !important;
                opacity: 1 !important;
                white-space: nowrap !important;
                flex-shrink: 0 !important;
            }
            
            .personalized-link-item .link-name-mobile,
            .personalized-link-item strong {
                font-size: 15px !important;
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                width: 100% !important;
                margin-top: 8px !important;
                word-break: break-word !important;
                overflow-wrap: break-word !important;
            }
            
            /* Link Box (URL e botão Copiar) */
            .personalized-link-item .link-box-mobile,
            .personalized-link-item .link-box {
                flex-direction: column !important;
                gap: 12px !important;
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                width: 100% !important;
                margin-bottom: 16px !important;
            }
            
            .personalized-link-item .link-input-mobile,
            .personalized-link-item .link-input {
                font-size: 12px !important;
                padding: 12px 14px !important;
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                width: 100% !important;
                min-width: 100% !important;
                max-width: 100% !important;
                overflow: visible !important;
                word-break: break-all !important;
                overflow-wrap: break-word !important;
            }
            
            .personalized-link-item .btn-copy-mobile,
            .personalized-link-item .btn-copy {
                padding: 12px 20px !important;
                font-size: 13px !important;
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                width: 100% !important;
                justify-content: center !important;
            }
            
            .personalized-link-item .btn-text {
                display: inline !important;
                visibility: visible !important;
            }
            
            /* Detalhes: Expirao, Slug, Uso - Mobile em linha quando possvel */
            .personalized-link-item .link-details-mobile,
            .personalized-link-item .link-details-content,
            .personalized-link-item > div:nth-of-type(3) {
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                flex-direction: row !important;
                flex-wrap: wrap !important;
                gap: 12px !important;
                width: 100% !important;
                padding: 12px !important;
                background: rgba(0,0,0,0.2) !important;
                border-radius: 8px !important;
                margin-bottom: 12px !important;
                align-items: center !important;
            }
            
            .personalized-link-item .detail-item-mobile,
            .personalized-link-item .detail-item-content,
            .personalized-link-item > div:nth-of-type(3) > span {
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                align-items: center !important;
                gap: 6px !important;
                white-space: nowrap !important;
            }
            
            .personalized-link-item > div:nth-of-type(3) > span i,
            .personalized-link-item .detail-item-mobile i,
            .personalized-link-item .detail-item-content i {
                display: inline-block !important;
                visibility: visible !important;
                opacity: 1 !important;
                flex-shrink: 0 !important;
            }
            
            .personalized-link-item > div:nth-of-type(3) > span span,
            .personalized-link-item .detail-item-mobile span,
            .personalized-link-item .detail-item-content span {
                display: inline !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
            
            .personalized-link-item > div:nth-of-type(3) > span strong,
            .personalized-link-item .detail-item-mobile strong,
            .personalized-link-item .detail-item-content strong {
                display: inline !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
            
            /* Botes de ao - Mobile em linha */
            .personalized-link-item .link-actions-mobile,
            .personalized-link-item > div:last-of-type {
                flex-direction: row !important;
                flex-wrap: wrap !important;
                gap: 8px !important;
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                width: 100% !important;
                justify-content: flex-end !important;
            }
            
            .personalized-link-item > div:last-of-type button,
            .personalized-link-item .link-actions-mobile button {
                width: auto !important;
                flex: 0 0 auto !important;
                justify-content: center !important;
                display: inline-flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                padding: 10px 16px !important;
                font-size: 13px !important;
                font-weight: 700 !important;
                min-height: auto !important;
            }
            
            .personalized-link-item .btn-copy,
            .personalized-link-item .btn-copy-mobile,
            .personalized-link-item .btn-copy-content {
                padding: 10px 16px !important;
                font-size: 13px !important;
                font-weight: 700 !important;
                min-height: 44px !important;
            }
            
            .personalized-link-item > div:last-of-type button span,
            .personalized-link-item .link-actions-mobile button span {
                display: inline !important;
                visibility: visible !important;
                opacity: 1 !important;
                font-size: 13px !important;
                white-space: normal !important;
                word-break: normal !important;
            }
            
            .personalized-link-item > div:last-of-type button i,
            .personalized-link-item .link-actions-mobile button i {
                display: inline-block !important;
                visibility: visible !important;
                opacity: 1 !important;
                margin-right: 6px !important;
            }
            
            /* GARANTIR QUE TODOS OS TEXTOS APAREAM NO MOBILE */
            .personalized-link-item .link-name-content,
            .personalized-link-item .link-name-mobile,
            .personalized-link-item strong {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                color: var(--text, #ECECEC) !important;
                font-size: 15px !important;
                font-weight: 700 !important;
                line-height: 1.5 !important;
                margin: 8px 0 !important;
                word-break: break-word !important;
                overflow-wrap: break-word !important;
                width: 100% !important;
            }
            
            /* Texto do botão Copiar */
            .personalized-link-item .btn-copy .btn-text,
            .personalized-link-item .btn-copy-content .btn-text,
            .personalized-link-item .btn-copy-mobile .btn-text {
                display: inline-block !important;
                visibility: visible !important;
                opacity: 1 !important;
                font-size: 13px !important;
                font-weight: 700 !important;
                color: inherit !important;
                margin-left: 6px !important;
            }
            
            /* Textos dos botes de ao */
            .personalized-link-item button[onclick*="toggleLinkStatus"] span,
            .personalized-link-item button[onclick*="renewLink"] span,
            .personalized-link-item button[onclick*="editPersonalizedLink"] span,
            .personalized-link-item button[onclick*="deletePersonalizedLink"] span {
                display: inline-block !important;
                visibility: visible !important;
                opacity: 1 !important;
                font-size: 13px !important;
                font-weight: 700 !important;
            }
            
            /* Detalhes com textos completos */
            .personalized-link-item .detail-item-content span,
            .personalized-link-item .detail-item-mobile span {
                display: inline !important;
                visibility: visible !important;
                opacity: 1 !important;
                font-size: 13px !important;
                color: var(--text-dark, #A1A1A1) !important;
                white-space: normal !important;
                word-break: break-word !important;
            }
            
            .personalized-link-item .detail-item-content strong,
            .personalized-link-item .detail-item-mobile strong {
                display: inline !important;
                visibility: visible !important;
                opacity: 1 !important;
                font-size: 13px !important;
                font-weight: 700 !important;
                color: var(--text, #ECECEC) !important;
            }
            
            /* MOBILE: Estilos para links personalizados - FORAR VISIBILIDADE */
            .mobile-link-item,
            .personalized-link-item {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                width: 100% !important;
                padding: 16px !important;
            }
            
            /* FORAR TODOS OS ELEMENTOS DENTRO DO CARD A SEREM VISVEIS */
            .personalized-link-item > * {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
            
            /* Header: Status e Nome */
            .link-header-content,
            .link-header-mobile {
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                width: 100% !important;
                flex-direction: row !important;
                align-items: center !important;
                gap: 12px !important;
                margin-bottom: 12px !important;
            }
            
            .status-badge {
                display: inline-block !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
            
            .link-name-content,
            .link-name-mobile,
            .personalized-link-item strong {
                display: inline-block !important;
                visibility: visible !important;
                opacity: 1 !important;
                flex: 1 !important;
            }
            
            .status-badge {
                display: inline-block !important;
                visibility: visible !important;
                opacity: 1 !important;
                align-self: flex-start !important;
            }
            
            .link-name-content,
            .link-name-mobile {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                width: 100% !important;
                font-size: 15px !important;
                font-weight: 700 !important;
                margin-top: 8px !important;
                margin-bottom: 8px !important;
                word-break: break-word !important;
                overflow-wrap: break-word !important;
                color: var(--text, #ECECEC) !important;
                line-height: 1.5 !important;
            }
            
            /* Link Box (URL e botão Copiar) */
            .link-box-content,
            .link-box-mobile {
                display: flex !important;
                flex-direction: column !important;
                visibility: visible !important;
                opacity: 1 !important;
                width: 100% !important;
                gap: 12px !important;
                margin-bottom: 16px !important;
            }
            
            /* FORAR LINHA NO MOBILE - Input e botão Copiar lado a lado */
            .link-box-content,
            .link-box-mobile,
            .personalized-link-item .link-box {
                display: flex !important;
                flex-direction: row !important;
                gap: 10px !important;
                align-items: stretch !important;
                visibility: visible !important;
                opacity: 1 !important;
                width: 100% !important;
                margin-bottom: 12px !important;
            }
            
            .link-input-content,
            .link-input-mobile,
            .personalized-link-item .link-input {
                flex: 1 !important;
                min-width: 200px !important;
                width: auto !important;
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
            
            .btn-copy-content,
            .btn-copy-mobile,
            .personalized-link-item .btn-copy {
                flex-shrink: 0 !important;
                width: auto !important;
                min-width: 100px !important;
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
            
            .btn-copy-content .btn-text,
            .btn-copy-mobile .btn-text,
            .personalized-link-item .btn-copy .btn-text {
                display: inline-block !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
            
            .link-input-content,
            .link-input-mobile {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                width: 100% !important;
                max-width: 100% !important;
                min-width: 0 !important;
                flex: none !important;
                padding: 12px 14px !important;
                font-size: 12px !important;
                background: var(--background-color, #0D0D0F) !important;
                border: 2px solid var(--border-color, #2C2C2F) !important;
                border-radius: 12px !important;
                color: var(--text, #ECECEC) !important;
                font-family: monospace !important;
                word-break: break-all !important;
                overflow-wrap: break-word !important;
                box-sizing: border-box !important;
            }
            
            .btn-copy-content,
            .btn-copy-mobile {
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                width: 100% !important;
                max-width: 100% !important;
                justify-content: center !important;
                padding: 12px 20px !important;
                font-size: 13px !important;
                flex-shrink: 0 !important;
            }
            
            /* Detalhes em coluna no mobile */
            .link-details-content,
            .link-details-mobile {
                flex-direction: column !important;
                gap: 12px !important;
            }
            
            /* Botes de ao em coluna no mobile */
            .link-actions-content,
            .link-actions-mobile {
                flex-direction: column !important;
                gap: 10px !important;
                justify-content: flex-start !important;
            }
            
            .btn-action-content,
            .btn-action-toggle,
            .btn-action-renew,
            .btn-action-edit,
            .btn-action-delete {
                width: 100% !important;
                max-width: 100% !important;
                justify-content: center !important;
            }
            
            .btn-text {
                display: inline-block !important;
                visibility: visible !important;
                opacity: 1 !important;
                font-size: 13px !important;
                font-weight: 700 !important;
                margin-left: 6px !important;
                white-space: normal !important;
            }
            
            /* Detalhes: Expirao, Slug, Uso */
            .link-details-content,
            .link-details-mobile {
                display: flex !important;
                flex-direction: column !important;
                visibility: visible !important;
                opacity: 1 !important;
                width: 100% !important;
                gap: 12px !important;
                padding: 12px !important;
                margin-bottom: 16px !important;
            }
            
            .detail-item-content,
            .detail-item-mobile {
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                width: 100% !important;
                align-items: center !important;
                gap: 6px !important;
                flex-wrap: wrap !important;
                font-size: 13px !important;
                margin-bottom: 8px !important;
            }
            
            .detail-item-content i,
            .detail-item-mobile i {
                display: inline-block !important;
                visibility: visible !important;
                flex-shrink: 0 !important;
                color: var(--dourado-principal, #FFC700) !important;
            }
            
            .detail-item-content span,
            .detail-item-mobile span {
                display: inline !important;
                visibility: visible !important;
                opacity: 1 !important;
                color: var(--text-dark, #A1A1A1) !important;
                white-space: normal !important;
            }
            
            .detail-item-content strong,
            .detail-item-mobile strong {
                display: inline !important;
                visibility: visible !important;
                opacity: 1 !important;
                font-weight: 700 !important;
                color: var(--text, #ECECEC) !important;
            }
            
            /* Botes de ao */
            .link-actions-content,
            .link-actions-mobile {
                display: flex !important;
                flex-direction: column !important;
                visibility: visible !important;
                opacity: 1 !important;
                width: 100% !important;
                gap: 10px !important;
                justify-content: flex-start !important;
            }
            
            .btn-action-content,
            .btn-action-toggle,
            .btn-action-renew,
            .btn-action-edit,
            .btn-action-delete {
                display: inline-flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                width: 100% !important;
                max-width: 100% !important;
                justify-content: center !important;
                padding: 12px 20px !important;
                font-size: 13px !important;
            }
            
            .btn-action-content span,
            .btn-action-toggle span,
            .btn-action-renew span,
            .btn-action-edit span,
            .btn-action-delete span {
                display: inline !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
            
            .btn-action-content i,
            .btn-action-toggle i,
            .btn-action-renew i,
            .btn-action-edit i,
            .btn-action-delete i {
                display: inline-block !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
            
            .tab-label {
                display: inline;
            }
            
            .tab-count {
                display: inline;
            }
            
            .guest-list-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 12px;
            }
            
            .header-actions {
                width: 100%;
                flex-wrap: wrap;
            }
            
            .header-actions .btn {
                flex: 1 1 auto;
                min-width: 100px;
            }
            
            .modal-content,
            .custom-fields-content {
                margin: 10px;
                max-width: calc(100% - 20px);
                max-height: calc(100vh - 20px);
            }
            
            .modal-header,
            .custom-fields-header {
                padding: 16px;
            }
            
            .modal-info,
            #custom-fields-editor {
                padding: 16px;
            }
            
            .info-row {
                flex-direction: column;
                gap: 8px;
            }
            
            .info-label {
                min-width: auto;
            }
        }
    </style>
    @vite(['resources/js/pages/guestListEdit.js'])
</head>
<body class="form-edit-page form-edit-page-body">
    <!-- Estrutura do Editor KingForms será carregada dinamicamente via formPageEdit.js quando necessário -->
    
    <!-- Estrutura de Gerenciamento (será mostrada quando não houver itemId ou mode=manage) -->
    <div class="guest-list-management-container" id="guest-list-management-container">
    <div class="guest-list-header">
        <h1>
            <i class="fas fa-users"></i>
            <span id="event-title">Lista de Convidados</span>
        </h1>
        <div class="header-actions">
            <button class="btn btn-secondary" onclick="deleteGuestList()" style="background: rgba(255, 68, 68, 0.1); border-color: #ff4444; color: #ff4444;">
                <i class="fas fa-trash"></i> Excluir Lista
            </button>
            <button class="btn btn-secondary" onclick="goBackToDashboard()">
                <i class="fas fa-arrow-left"></i> Voltar
            </button>
            <button class="btn btn-primary" onclick="saveGuestList()">
                <i class="fas fa-save"></i> Salvar
            </button>
        </div>
    </div>
    
    <div class="main-container">
        <!-- Abas -->
        <div class="tabs-container">
            <button class="tab-button" data-tab="registered" onclick="switchTab('registered')">
                <i class="fas fa-user-plus"></i> <span class="tab-label">Inscritos</span> <span class="tab-count" id="tab-count-registered">(0)</span>
            </button>
            <button class="tab-button" data-tab="confirmation" onclick="switchTab('confirmation')">
                <i class="fas fa-user-check"></i> <span class="tab-label">Para Confirmao</span> <span class="tab-count" id="tab-count-confirmation">(0)</span>
            </button>
            <button class="tab-button" data-tab="confirmed" onclick="switchTab('confirmed')">
                <i class="fas fa-check-circle"></i> <span class="tab-label">Confirmados</span> <span class="tab-count" id="tab-count-confirmed">(0)</span>
            </button>
            <button class="tab-button active" data-tab="links" onclick="switchTab('links')">
                <i class="fas fa-link"></i> <span class="tab-label">Links</span>
            </button>
        </div>
        
        <!-- Aba: Convidados Cadastrados -->
        <div id="tab-registered" class="tab-content">
            <!-- Seção de Campos Customizados -->
            <div class="link-section" style="margin-bottom: 24px; background: linear-gradient(135deg, rgba(74, 144, 226, 0.1), rgba(74, 144, 226, 0.05)); border: 2px solid rgba(74, 144, 226, 0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h3 style="color: #4A90E2; margin: 0;">
                        <i class="fas fa-sliders-h"></i> Personalização do Formulrio
                    </h3>
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" id="use-custom-form" onchange="toggleCustomForm()" style="width: 20px; height: 20px; cursor: pointer;">
                        <span>Usar campos customizados (KingForms)</span>
                    </label>
                </div>
                <div id="custom-form-builder" style="display: none; margin-top: 16px;">
                    <p style="color: var(--text-dark, #A1A1A1); margin-bottom: 16px; font-size: 14px;">
                        Personalize o formulrio de inscrio com campos customizados. Se desativado, será usado o formulrio padr</p>
                    <button onclick="openCustomFieldsEditor()" class="btn btn-secondary" style="width: 100%; padding: 12px; margin-bottom: 12px;">
                        <i class="fas fa-edit"></i> Editar Campos Customizados
                    </button>
                    <div id="custom-fields-preview" style="padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px; font-size: 13px; color: var(--text-dark, #A1A1A1);">
                        <i class="fas fa-info-circle"></i> Nenhum campo customizado definido. Clique em "Editar Campos Customizados" para comear.
                    </div>
                </div>
            </div>
            
            <div class="link-section" style="background: linear-gradient(135deg, rgba(255,199,0,0.1), rgba(255,199,0,0.05)); border: 2px solid rgba(255,199,0,0.3);">
                <h3 style="color: var(--dourado-principal, #FFC700); margin-bottom: 12px;">
                    <i class="fas fa-link"></i> Link Pblico de Inscrio
                </h3>
                <p style="color: var(--text, #ECECEC); margin-bottom: 20px; font-size: 15px; line-height: 1.6;">
                    <strong>Compartilhe este link</strong> para que as pessoas possam se inscrever no evento. Quando algum preencher o formulrio atravdeste link, os dados seráo salvos <strong>diretamente nesta lista</strong> e aparecero na aba "Convidados Cadastrados".
                </p>
                <div class="link-box" style="display: flex; gap: 12px; align-items: center;">
                    <input type="text" class="link-input" id="registration-link" readonly style="flex: 1; padding: 14px 16px; background: var(--background-color, #0D0D0F); border: 2px solid var(--border-color, #2C2C2F); border-radius: 12px; color: var(--text, #ECECEC); font-size: 14px; font-family: monospace;">
                    <button class="btn-copy" onclick="copyToClipboard('registration-link', event)" style="padding: 14px 24px; background: linear-gradient(135deg, #FFC700, #FFA500); color: #000; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; white-space: nowrap;">
                        <i class="fas fa-copy"></i> Copiar Link
                    </button>
                </div>
                <p style="color: var(--text-dark, #A1A1A1); margin-top: 12px; font-size: 13px;">
                    <i class="fas fa-info-circle"></i> Envie este link por WhatsApp, email ou qualquer outro meio. As pessoas que preencherem aparecero aqui automaticamente.
                </p>
            </div>
            
            <div class="stats-cards" id="registered-stats">
                <!-- Stats seráo preenchidos via JavaScript -->
            </div>
            
            <!-- Busca -->
            <div style="margin-bottom: 20px; display: flex; gap: 12px; align-items: center;">
                <div style="flex: 1; position: relative;">
                    <i class="fas fa-search" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-dark, #A1A1A1);"></i>
                    <input type="text" id="search-registered" placeholder="Buscar convidados cadastrados..." 
                           oninput="filterGuests('registered', this.value)"
                           style="width: 100%; padding: 12px 16px 12px 48px; background: var(--card-background-color, #1C1C21); border: 1px solid var(--border-color, #2C2C2F); border-radius: 12px; color: var(--text, #ECECEC); font-size: 14px;">
                </div>
                <button onclick="exportToPDF('registered')" class="btn btn-secondary" style="padding: 12px 20px;">
                    <i class="fas fa-file-pdf"></i> Exportar PDF
                </button>
            </div>
            
            <div class="guests-table">
                <div class="table-header">
                    <div>Nome Completo</div>
                    <div>Email</div>
                    <div>Telefone</div>
                    <div>Status</div>
                    <div>Inscrito em</div>
                    <div>Aes</div>
                </div>
                <div id="registered-guests-list">
                    <!-- Lista será preenchida via JavaScript -->
                </div>
            </div>
        </div>
        
        <!-- Aba: Convidados para Confirmao -->
        <div id="tab-confirmation" class="tab-content">
            <div class="link-section">
                <h3><i class="fas fa-link"></i> Link Pblico de Confirmao</h3>
                <p style="color: var(--text-dark, #A1A1A1); margin-bottom: 16px;">
                    Compartilhe este link para que as pessoas possam confirmar a presena dos convidados. Quem tiver o link pode acessar esta aba e confirmar convidados.
                </p>
                <div class="link-box">
                    <input type="text" class="link-input" id="confirmation-link" readonly>
                    <button class="btn-copy" onclick="copyToClipboard('confirmation-link', event)">
                        <i class="fas fa-copy"></i> Copiar
                    </button>
                </div>
            </div>
            
            <div class="stats-cards" id="confirmation-stats">
                <!-- Stats seráo preenchidos via JavaScript -->
            </div>
            
            <!-- Busca -->
            <div style="margin-bottom: 20px; display: flex; gap: 12px; align-items: center;">
                <div style="flex: 1; position: relative;">
                    <i class="fas fa-search" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-dark, #A1A1A1);"></i>
                    <input type="text" id="search-confirmation" placeholder="Buscar convidados para confirma.." 
                           oninput="filterGuests('confirmation', this.value)"
                           style="width: 100%; padding: 12px 16px 12px 48px; background: var(--card-background-color, #1C1C21); border: 1px solid var(--border-color, #2C2C2F); border-radius: 12px; color: var(--text, #ECECEC); font-size: 14px;">
                </div>
                <button onclick="exportToPDF('confirmation')" class="btn btn-secondary" style="padding: 12px 20px;">
                    <i class="fas fa-file-pdf"></i> Exportar PDF
                </button>
            </div>
            
            <div class="guests-table">
                <div class="table-header">
                    <div>Nome Completo</div>
                    <div>Email</div>
                    <div>Telefone</div>
                    <div>Status</div>
                    <div>Inscrito em</div>
                    <div>Aes</div>
                </div>
                <div id="confirmation-guests-list">
                    <!-- Lista será preenchida via JavaScript -->
                </div>
            </div>
        </div>
        
        <!-- Aba: Convidados Confirmados -->
        <div id="tab-confirmed" class="tab-content">
            <div class="link-section" style="background: linear-gradient(135deg, rgba(74, 144, 226, 0.1), rgba(74, 144, 226, 0.05)); border: 2px solid rgba(74, 144, 226, 0.3);">
                <h3 style="color: #4A90E2; margin-bottom: 12px;"><i class="fas fa-eye"></i> Link Pblico de Visualizao Completa (Portaria)</h3>
                <p style="color: var(--text, #ECECEC); margin-bottom: 20px; font-size: 15px; line-height: 1.6;">
                    <strong>Compartilhe este link com a pessoa da portaria</strong> para que ela possa ver todas as abas (Cadastrados, para Confirmao e Confirmados) em uma nica página pblica.
                </p>
                <div class="link-box">
                    <input type="text" class="link-input" id="public-view-link" readonly style="flex: 1; padding: 14px 16px; background: var(--background-color, #0D0D0F); border: 2px solid var(--border-color, #2C2C2F); border-radius: 12px; color: var(--text, #ECECEC); font-size: 14px; font-family: monospace;">
                    <button class="btn-copy" onclick="copyToClipboard('public-view-link', event)" style="padding: 14px 24px; background: linear-gradient(135deg, #4A90E2, #357ABD); color: #fff; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; white-space: nowrap;">
                        <i class="fas fa-copy"></i> Copiar Link
                    </button>
                </div>
                <p style="color: var(--text-dark, #A1A1A1); margin-top: 12px; font-size: 13px;">
                    <i class="fas fa-info-circle"></i> A pessoa da portaria poder ver todas as informaes dos convidados em uma página nica e completa.
                </p>
            </div>
            
            <div class="link-section">
                <h3><i class="fas fa-link"></i> Link Pblico para Ver Confirmados</h3>
                <p style="color: var(--text-dark, #A1A1A1); margin-bottom: 16px;">
                    Compartilhe este link para que as pessoas possam ver a lista de convidados confirmados. Quem tiver o link pode acessar esta aba.
                </p>
                <div class="link-box">
                    <input type="text" class="link-input" id="confirmed-link" readonly>
                    <button class="btn-copy" onclick="copyToClipboard('confirmed-link', event)">
                        <i class="fas fa-copy"></i> Copiar
                    </button>
                </div>
            </div>
            
            <div class="stats-cards" id="confirmed-stats">
                <!-- Stats seráo preenchidos via JavaScript -->
            </div>
            
            <!-- Busca -->
            <div style="margin-bottom: 20px; display: flex; gap: 12px; align-items: center;">
                <div style="flex: 1; position: relative;">
                    <i class="fas fa-search" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-dark, #A1A1A1);"></i>
                    <input type="text" id="search-confirmed" placeholder="Buscar convidados confirmados..." 
                           oninput="filterGuests('confirmed', this.value)"
                           style="width: 100%; padding: 12px 16px 12px 48px; background: var(--card-background-color, #1C1C21); border: 1px solid var(--border-color, #2C2C2F); border-radius: 12px; color: var(--text, #ECECEC); font-size: 14px;">
                </div>
                <button onclick="exportToPDF('confirmed')" class="btn btn-secondary" style="padding: 12px 20px;">
                    <i class="fas fa-file-pdf"></i> Exportar PDF
                </button>
            </div>
            
            <div class="guests-table">
                <div class="table-header">
                    <div>Nome Completo</div>
                    <div>Email</div>
                    <div>Telefone</div>
                    <div>Status</div>
                    <div>Confirmado em</div>
                    <div>Aes</div>
                </div>
                <div id="confirmed-guests-list">
                    <!-- Lista será preenchida via JavaScript -->
                </div>
            </div>
        </div>
        
        <!-- Aba: Links -->
        <div id="tab-links" class="tab-content active">
            <!-- Links para Compartilhar -->
            <div class="link-section" style="background: linear-gradient(135deg, rgba(37, 211, 102, 0.1), rgba(37, 211, 102, 0.05)); border: 2px solid rgba(37, 211, 102, 0.3); margin-bottom: 24px;">
                <h3 style="color: #25D366; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-link"></i> Links para Compartilhar
                </h3>
                
                <!-- Links de Cadastro Personalizados -->
                <div style="margin-bottom: 24px;">
                    <h4 style="color: var(--text, #ECECEC); margin-bottom: 8px; font-size: 16px; font-weight: 600;">
                        Links de Cadastro Personalizados
                    </h4>
                    <p style="color: var(--text-dark, #A1A1A1); margin-bottom: 16px; font-size: 14px; line-height: 1.6;">
                        Crie e gerencie links personalizados para cadastro. Crie links personalizados para as pessoas se inscreverem. Cada link pode ter sua prpria descrição, validade e limite de usos.
                    </p>
                    <button onclick="openCreateLinkModal()" class="btn-create-link" style="margin-bottom: 16px; padding: 12px 20px; background: linear-gradient(135deg, #25D366, #1DB954); color: #fff; border: none; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px; justify-content: center; width: 100%; max-width: 300px;">
                        <i class="fas fa-plus"></i> Criar Novo Link Personalizado
                    </button>
                    <div id="personalized-links-list">
                        <!-- Links personalizados seráo preenchidos via JavaScript -->
                    </div>
                </div>
                
                <!-- Link da Portaria -->
                <div id="portaria-link-section" style="background: linear-gradient(135deg, rgba(74, 144, 226, 0.1), rgba(74, 144, 226, 0.05)); border: 2px solid rgba(74, 144, 226, 0.3); border-radius: 12px; padding: 20px; margin-top: 24px; display: block !important; visibility: visible !important; overflow: visible !important;">
                    <h4 style="color: #4A90E2; margin-bottom: 8px; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-building"></i> Link da Portaria
                    </h4>
                    <p style="color: var(--text-dark, #A1A1A1); margin-bottom: 16px; font-size: 14px; line-height: 1.6;">
                        Para confirmar chegada dos convidados. Envie este link para o porteiro/recepcionista. Ele poder ver a lista completa, buscar convidados e confirmar presenas.
                    </p>
                    <div class="link-box" style="display: flex; gap: 12px; align-items: center; margin-bottom: 16px;">
                        <input type="text" class="link-input" id="portaria-link" readonly style="flex: 1; padding: 14px 16px; background: var(--background-color, #0D0D0F); border: 2px solid var(--border-color, #2C2C2F); border-radius: 12px; color: var(--text, #ECECEC); font-size: 14px; font-family: monospace; word-break: break-all;">
                        <button class="btn-copy" onclick="copyToClipboard('portaria-link', event)" style="padding: 14px 24px; background: linear-gradient(135deg, #4A90E2, #357ABD); color: #fff; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; white-space: nowrap;">
                            <i class="fas fa-copy"></i> Copiar
                        </button>
                    </div>
                    
                    <!-- Personalizar Link (Slug) -->
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(74, 144, 226, 0.2);">
                        <label style="color: var(--text, #ECECEC); font-size: 14px; font-weight: 600; margin-bottom: 8px; display: block;">
                            Personalizar Link (Slug)
                        </label>
                        <div class="link-box" style="display: flex; gap: 12px; align-items: center;">
                            <input type="text" class="link-input" id="portaria-slug-input" placeholder="ex: kingsuces" style="flex: 1; padding: 12px 16px; background: var(--background-color, #0D0D0F); border: 2px solid var(--border-color, #2C2C2F); border-radius: 12px; color: var(--text, #ECECEC); font-size: 14px;">
                            <button onclick="savePortariaSlug()" class="btn-copy" style="padding: 12px 24px; background: linear-gradient(135deg, #4A90E2, #357ABD); color: #fff; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; white-space: nowrap;">
                                <i class="fas fa-save"></i> Salvar
                            </button>
                        </div>
                        <p style="color: var(--text-dark, #A1A1A1); margin-top: 8px; font-size: 12px;">
                            Crie um link curto e fcil de compartilhar. Ex: seusite.com/portaria/kingsuces
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Modal de Visualizao Completa -->
    <div id="guest-detail-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-user"></i> Dados do Convidado</h2>
                <button class="close-modal" onclick="closeGuestDetailModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div id="guest-detail-content" class="modal-info">
                <!-- conteúdo será preenchido via JavaScript -->
            </div>
        </div>
    </div>
    
    <!-- Modal de Campos Customizados (integrado com KingForms) -->
    <div id="custom-fields-modal" class="custom-fields-modal">
        <div class="custom-fields-content">
            <div class="custom-fields-header">
                <h2><i class="fas fa-sliders-h"></i> Editar Campos Customizados</h2>
                <button class="close-modal" onclick="closeCustomFieldsModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div style="color: var(--text-dark, #A1A1A1); margin-bottom: 24px; padding: 16px; background: rgba(255, 199, 0, 0.1); border-radius: 8px; border: 1px solid rgba(255, 199, 0, 0.3);">
                <p style="margin: 0; line-height: 1.6;">
                    <strong style="color: var(--dourado-principal, #FFC700);">Integrao com KingForms</strong><br>
                    Você pode criar um formulrio personalizado para a inscriOs campos padrão (Nome, WhatsApp, CPF) seráo sempre includos automaticamente.
                </p>
            </div>
            <div id="custom-fields-editor">
                <!-- conteúdo será preenchido via JavaScript -->
            </div>
        </div>
    </div>
    
    </div> <!-- Fechar guest-list-management-container -->

</body>
</html>

