<!DOCTYPE html>
<html lang="pt-BR" class="form-edit-page-html">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Editar King Forms - Dashboard</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="apple-touch-icon" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="stylesheet" href="/vendor/fontawesome/css/all.min.css">
    <link rel="stylesheet" href="/vendor/cropperjs/cropper.min.css" />
    <script src="/vendor/cropperjs/cropper.min.js"></script>
    <script src="/vendor/sortablejs/Sortable.min.js"></script>
    <script src="/vendor/chartjs/chart.umd.min.js"></script>
    <script src="/config.js?v=2026-09-09-vite1"></script>
    <style>
        * {
            box-sizing: border-box;
        }
        
        html.form-edit-page-html {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 100vh !important;
            overflow-x: hidden !important;
            overflow-y: auto !important;
            position: relative !important;
        }
        
        body.form-edit-page-body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 100vh !important;
            overflow-x: hidden !important;
            overflow-y: auto !important;
            position: relative !important;
        }
        
        .form-edit-page {
            min-height: 100vh;
            background: var(--background-color, #0D0D0F);
            display: flex;
            flex-direction: column;
            padding: 0;
        }
        
        .form-edit-header {
            background: linear-gradient(135deg, var(--card-background-color, #1C1C21) 0%, rgba(28, 28, 33, 0.95) 100%);
            border-bottom: 2px solid var(--border-color, #2C2C2F);
            padding: 20px 32px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 100;
            backdrop-filter: blur(10px);
            box-shadow: 0 2px 12px rgba(0,0,0,0.3);
        }
        
        .form-edit-header h1 {
            color: #FFFFFF !important;
            margin: 0;
            font-size: 26px;
            font-weight: 800;
            display: flex;
            align-items: center;
            gap: 12px;
            letter-spacing: -0.5px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .form-edit-header h1::before {
            content: '';
            width: 4px;
            height: 28px;
            background: linear-gradient(180deg, var(--dourado-principal, #FFC700), rgba(255, 199, 0, 0.6));
            border-radius: 2px;
        }
        
        .form-edit-main {
            display: flex;
            flex: 1;
            overflow: hidden;
        }
        
        .form-edit-sidebar {
            width: 280px;
            background: var(--card-background-color, #1C1C21);
            border-right: 1px solid var(--border-color, #2C2C2F);
            padding: 20px 0;
            overflow-y: auto;
            flex-shrink: 0;
        }
        
        .sidebar-section {
            padding: 0 16px;
            margin-bottom: 32px;
        }
        
        .sidebar-section-title {
            font-size: 11px;
            font-weight: 700;
            color: #FFFFFF !important;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 16px;
            padding: 0 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        
        .sidebar-section-title::before {
            content: '';
            width: 3px;
            height: 14px;
            background: linear-gradient(180deg, var(--dourado-principal, #FFC700), rgba(255, 199, 0, 0.6));
            border-radius: 2px;
        }
        
        .sidebar-btn {
            width: 100%;
            padding: 14px 18px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            color: #FFFFFF !important;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 14px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            text-align: left;
            margin-bottom: 8px;
            position: relative;
            overflow: hidden;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        
        .sidebar-btn::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            width: 3px;
            background: linear-gradient(180deg, var(--dourado-principal, #FFC700), rgba(255, 199, 0, 0.6));
            transform: scaleY(0);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .sidebar-btn:hover {
            background: linear-gradient(90deg, rgba(255, 199, 0, 0.15), rgba(255, 199, 0, 0.05));
            color: var(--dourado-principal, #FFC700);
            border-color: rgba(255, 199, 0, 0.3);
            transform: translateX(4px);
            box-shadow: 0 4px 12px rgba(255, 199, 0, 0.15);
        }
        
        .sidebar-btn:hover::before {
            transform: scaleY(1);
        }
        
        .sidebar-btn:active {
            transform: translateX(2px);
        }
        
        .sidebar-btn i {
            width: 22px;
            text-align: center;
            font-size: 17px;
            flex-shrink: 0;
            transition: transform 0.3s;
        }
        
        .sidebar-btn:hover i {
            transform: scale(1.15);
        }
        
        .sidebar-btn span {
            flex: 1;
        }
        
        .form-edit-container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .form-tabs-container {
            background: var(--card-background-color, #1C1C21);
            border-radius: 12px 12px 0 0;
            border: 1px solid var(--border-color, #2C2C2F);
            border-bottom: none;
            padding: 0;
        }
        
        .form-tabs {
            display: flex;
            gap: 0;
        }
        
        .form-tab-btn {
            flex: 1;
            padding: 15px 20px;
            background: transparent;
            border: none;
            border-bottom: 3px solid transparent;
            color: #FFFFFF !important;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s;
            font-size: 16px;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        
        .form-tab-btn:hover {
            color: #FFC700 !important;
            background: rgba(255, 199, 0, 0.15);
        }
        
        .form-tab-btn.active {
            color: #FFC700 !important;
            border-bottom-color: #FFC700;
            background: rgba(255, 199, 0, 0.2);
        }
        
        .form-tab-content {
            display: none;
            background: var(--card-background-color, #1C1C21);
            border: 1px solid var(--border-color, #2C2C2F);
            border-top: none;
            border-radius: 0 0 12px 12px;
            padding: 30px;
            min-height: 500px;
        }
        
        .form-tab-content.active {
            display: block;
        }
        
        .input-group {
            margin-bottom: 25px;
        }
        
        .input-group label {
            display: block;
            margin-bottom: 8px;
            color: #FFFFFF !important;
            font-weight: 600;
            font-size: 14px;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        
        .input-group input[type="text"],
        .input-group input[type="tel"],
        .input-group input[type="color"],
        .input-group select,
        .input-group textarea {
            width: 100%;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.1);
            border: 2px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            color: #FFFFFF !important;
            font-size: 16px;
            box-sizing: border-box;
        }
        
        .input-group input[type="text"]::placeholder,
        .input-group input[type="tel"]::placeholder,
        .input-group textarea::placeholder {
            color: rgba(255, 255, 255, 0.6) !important;
        }
        
        .input-group input[type="color"] {
            height: 50px;
            cursor: pointer;
        }
        
        .input-group input:focus,
        .input-group select:focus,
        .input-group textarea:focus {
            outline: none;
            border-color: var(--dourado-principal, #FFC700);
        }
        
        .image-upload-area {
            border: 2px dashed var(--border-color, #2C2C2F);
            border-radius: 8px;
            padding: 30px;
            text-align: center;
            cursor: pointer;
            background: var(--background-color, #0D0D0F);
            transition: all 0.3s;
        }
        
        .image-upload-area:hover {
            border-color: var(--dourado-principal, #FFC700);
            background: rgba(255, 199, 0, 0.05);
        }
        
        .image-upload-area img {
            max-width: 100%;
            max-height: 300px;
            border-radius: 8px;
            margin-bottom: 15px;
        }
        
        .btn-save-form {
            padding: 14px 32px;
            background: linear-gradient(135deg, var(--dourado-principal, #FFC700), #FFD700) !important;
            color: #000 !important;
            border: none !important;
            border-radius: 12px;
            font-weight: 700;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 12px rgba(255, 199, 0, 0.3);
            position: relative;
            overflow: hidden;
            display: flex !important;
            align-items: center;
            gap: 8px;
            z-index: 1000;
            visibility: visible !important;
            opacity: 1 !important;
        }
        
        .btn-save-form::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            transition: left 0.5s;
        }
        
        .btn-save-form:hover {
            background: linear-gradient(135deg, #FFD700, #FFC700);
            transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(255, 199, 0, 0.4);
        }
        
        .btn-save-form:hover::before {
            left: 100%;
        }
        
        .btn-save-form:active {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(255, 199, 0, 0.3);
        }
        
        .btn-save-form:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .btn-back {
            padding: 10px 20px;
            background: transparent;
            color: var(--text, #ECECEC);
            border: 1px solid var(--border-color, #2C2C2F);
            border-radius: 8px;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s;
        }
        
        .btn-back:hover {
            background: var(--card-background-color, #1C1C21);
            border-color: var(--dourado-principal, #FFC700);
        }
        
        /* Preview Area - Google Forms Style Premium */
        .form-edit-preview {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            background: linear-gradient(135deg, #1C1C21 0%, #0D0D0F 100%);
            padding: 0;
            display: flex !important;
            flex-direction: column;
            height: 100%;
            position: relative;
            animation: fadeIn 0.5s ease-out;
            visibility: visible !important;
            opacity: 1 !important;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .form-preview-container {
            width: 100%;
            background: #f8f9fa;
            border-radius: 0;
            box-shadow: none;
            padding: 24px;
            margin: 0;
            min-height: 400px;
            position: relative;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            animation: slideInUp 0.5s ease-out;
            overflow-y: auto;
            overflow-x: hidden;
            max-height: none;
            border: none;
        }
        
        /* Estilos para preview idêntico ao formulário público */
        .preview-form-wrapper {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1000px;
            margin: 0 auto;
        }
        
        .preview-checkout-layout {
            display: grid;
            grid-template-columns: 1fr;
            gap: 32px;
            align-items: start;
        }
        
        .preview-digital-form {
            background: white;
            padding: 48px 56px;
            border-radius: 24px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            border: 1px solid rgba(0,0,0,0.06);
            position: relative;
            overflow: hidden;
        }
        
        .preview-digital-form::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, var(--preview-primary-color, #4A90E2), rgba(74, 144, 226, 0.6));
        }
        
        .preview-form-group {
            margin-bottom: 36px;
            position: relative;
            padding-left: 8px;
        }

        .preview-form-group .question-edit-bar {
            display: flex !important;
            gap: 4px;
            z-index: 1000;
        }

        .preview-form-group .question-drag-handle {
            position: absolute;
            left: 4px;
            top: 18px;
            color: #9aa0a6;
            cursor: grab;
            z-index: 10;
            padding: 8px 6px;
            border-radius: 6px;
            opacity: 1;
        }

        .preview-form-group .question-drag-handle:hover {
            color: #5f6368;
            background: #e8eaed;
        }

        .preview-form-group .question-edit-btn[data-action="move-up"],
        .preview-form-group .question-edit-btn[data-action="move-down"],
        .form-question-item-preview .question-edit-btn[data-action="move-up"],
        .form-question-item-preview .question-edit-btn[data-action="move-down"] {
            color: #4A90E2 !important;
            background: rgba(74, 144, 226, 0.08) !important;
        }
        
        .preview-form-group label {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 14px;
            font-weight: 700;
            color: var(--preview-text-color, #202124);
            font-size: 15px;
            letter-spacing: -0.2px;
            line-height: 1.5;
        }
        
        .preview-form-group label::before {
            content: '';
            width: 3px;
            height: 18px;
            background: linear-gradient(180deg, var(--preview-primary-color, #4A90E2), rgba(74, 144, 226, 0.6));
            border-radius: 2px;
            display: inline-block;
        }
        
        .preview-form-input {
            width: 100%;
            padding: 16px 20px;
            border: 2px solid #e8eaed;
            border-radius: 14px;
            font-size: 15px;
            font-family: inherit;
            background: #f8f9fa;
            color: var(--preview-text-color, #202124);
            transition: all 0.2s;
            box-sizing: border-box;
        }
        
        .preview-form-input:focus {
            border-color: var(--preview-primary-color, #4A90E2);
            background: white;
            box-shadow: 0 0 0 3px rgba(74,144,226,0.1);
            outline: none;
        }
        
        .preview-checkout-sidebar-card {
            background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
            border-radius: 20px;
            padding: 32px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.08);
            border: 1px solid rgba(0,0,0,0.06);
        }
        
        .preview-form-header {
            background: linear-gradient(135deg, var(--preview-primary-color, #4A90E2) 0%, rgba(74, 144, 226, 0.9) 100%);
            color: white;
            padding: 24px;
            box-shadow: 0 2px 16px rgba(0,0,0,0.12);
            position: relative;
            z-index: 100;
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        
        .preview-form-title {
            margin: 0;
            font-size: 32px;
            font-weight: 700;
            flex: 1;
            letter-spacing: -0.5px;
            line-height: 1.2;
            color: white;
            word-wrap: break-word;
            overflow-wrap: break-word;
            cursor: text;
            outline: none;
            min-height: 48px;
        }
        
        .preview-form-title:hover {
            opacity: 0.9;
        }
        
        .preview-form-title:focus {
            opacity: 1;
            background: rgba(255,255,255,0.1);
            padding: 4px 8px;
            border-radius: 8px;
        }
        
        .preview-form-description {
            margin: 0;
            line-height: 1.9;
            color: var(--preview-text-color, #333);
            font-size: 16px;
            font-weight: 400;
            letter-spacing: 0.2px;
            word-wrap: break-word;
            overflow-wrap: break-word;
            cursor: text;
            outline: none;
            min-height: 24px;
        }
        
        .preview-form-description:hover {
            background: rgba(0,0,0,0.02);
            padding: 2px 4px;
            border-radius: 4px;
        }
        
        .preview-form-description:focus {
            background: rgba(0,0,0,0.05);
            padding: 2px 4px;
            border-radius: 4px;
        }
        
        /* Modo Desktop */
        .form-preview-container.preview-desktop {
            max-width: 900px;
            width: 100%;
        }
        
        /* Modo Mobile - Ajustes para preview */
        @media (max-width: 1024px) {
            .preview-checkout-layout {
                grid-template-columns: 1fr;
                gap: 24px;
            }
            
            .preview-digital-form {
                padding: 32px 24px;
            }
            
            .preview-form-title {
                font-size: 24px;
            }
            
            .preview-form-description {
                font-size: 14px;
            }
            
            .preview-form-group {
                margin-bottom: 24px;
            }
        }
        
        .form-preview-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, var(--dourado-principal, #FFC700), rgba(255, 199, 0, 0.6));
            z-index: 1;
        }
        
        .form-preview-container:hover {
            box-shadow: 0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1);
            transform: translateY(-2px);
        }
        
        #preview-header-image-container {
            width: 100%;
            position: relative;
            overflow: hidden;
            line-height: 0;
            background: #0a0a0a;
        }
        
        #preview-header-image {
            width: 100%;
            height: auto;
            max-width: 100%;
            max-height: none;
            object-fit: contain;
            object-position: center center;
            display: block;
            background: transparent;
        }
        
        #remove-header-image-preview {
            position: absolute;
            top: 16px;
            right: 16px;
            background: rgba(0,0,0,0.6);
            color: white;
            border: none;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            transition: all 0.2s;
            z-index: 10;
        }
        
        #remove-header-image-preview:hover {
            background: rgba(0,0,0,0.8);
            transform: scale(1.1);
        }
        
        .background-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: white;
            pointer-events: none;
            z-index: 0;
        }
        
        .form-preview-title {
            font-size: 32px;
            font-weight: 400;
            color: #202124 !important;
            margin: 0;
            padding: 32px 24px 8px 24px;
            border: none;
            border-bottom: 1px solid #dadce0;
            cursor: text;
            outline: none;
            min-height: 48px;
            line-height: 1.4;
            position: relative;
            z-index: 1;
            background: #ffffff !important;
            word-wrap: break-word;
            overflow-wrap: break-word;
            display: block;
            width: 100%;
            box-sizing: border-box;
            text-align: left;
        }
        
        .form-preview-title:hover {
            background: #fafafa;
        }
        
        .form-preview-title:focus {
            background: white;
            border-bottom: 2px solid var(--dourado-principal, #FFC700);
            margin-bottom: -1px;
        }
        
        .form-preview-description {
            font-size: 14px;
            color: #5f6368;
            margin: 0;
            padding: 8px 24px 24px 24px;
            border: none;
            border-bottom: 1px solid #dadce0;
            cursor: text;
            min-height: 24px;
            outline: none;
            line-height: 1.6;
            position: relative;
            z-index: 1;
            word-wrap: break-word;
            overflow-wrap: break-word;
            display: block;
            width: 100%;
            box-sizing: border-box;
            text-align: left;
        }
        
        .form-preview-description:hover {
            background: #fafafa;
        }
        
        .form-preview-description:focus {
            background: white;
            border-bottom: 2px solid var(--dourado-principal, #FFC700);
            margin-bottom: -1px;
        }
        
        #preview-questions-container {
            position: relative;
            z-index: 1;
            display: block;
            width: 100%;
            min-height: 100px;
            clear: both;
            overflow: visible;
        }

        .question-drag-handle {
            touch-action: none;
            user-select: none;
        }

        .question-sortable-ghost {
            opacity: 0.45;
            background: #e8f0fe !important;
            border: 2px dashed #4A90E2 !important;
            border-radius: 12px;
        }

        .question-sortable-chosen {
            box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }

        .question-sortable-drag {
            opacity: 1;
            cursor: grabbing !important;
        }
        
        .form-question-item-preview {
            background: #ffffff;
            border-radius: 8px;
            margin: 16px 24px;
            padding: 24px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            animation: slideInUp 0.4s ease-out;
            animation-fill-mode: both;
            position: relative;
            overflow: visible;
            clear: both;
            float: none;
            text-align: left;
        }
        
        .form-question-item-preview:nth-child(1) { animation-delay: 0.1s; }
        .form-question-item-preview:nth-child(2) { animation-delay: 0.2s; }
        .form-question-item-preview:nth-child(3) { animation-delay: 0.3s; }
        .form-question-item-preview:nth-child(4) { animation-delay: 0.4s; }
        .form-question-item-preview:nth-child(n+5) { animation-delay: 0.5s; }
        
        .form-question-item-preview:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.12);
            transform: translateY(-2px);
        }
        
        .form-question-item-preview::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 3px;
            background: linear-gradient(180deg, var(--dourado-principal, #FFC700), rgba(255, 199, 0, 0.6));
            border-radius: 8px 0 0 8px;
            opacity: 0;
            transition: opacity 0.3s;
        }
        
        .form-question-item-preview:hover::before {
            opacity: 1;
        }
        
        .form-question-item-preview:last-of-type {
            border-bottom: none;
        }
        
        .question-edit-bar {
            display: flex !important;
            position: absolute;
            top: 16px;
            right: 16px;
            background: linear-gradient(135deg, white, #fafafa);
            border: 1px solid #dadce0;
            border-radius: 12px;
            padding: 6px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1);
            z-index: 1000;
            white-space: nowrap;
            animation: fadeInUp 0.3s ease-out;
            backdrop-filter: blur(10px);
            gap: 4px;
            align-items: center;
            pointer-events: auto;
        }

        .preview-form-group .question-edit-bar,
        .form-question-item-preview .question-edit-bar {
            display: flex !important;
        }

        .question-edit-btn[data-action="move-up"],
        .question-edit-btn[data-action="move-down"] {
            color: #4A90E2 !important;
            background: rgba(74, 144, 226, 0.08);
        }

        .question-drag-handle {
            position: absolute;
            left: 8px;
            top: 18px;
            color: #9aa0a6;
            cursor: grab;
            z-index: 10;
            padding: 8px;
            border-radius: 8px;
            background: rgba(255,255,255,0.9);
            border: 1px solid #e8eaed;
            touch-action: none;
            user-select: none;
        }

        .question-drag-handle:hover {
            color: #4A90E2;
            background: #e8f0fe;
            border-color: #4A90E2;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .form-question-item-preview:hover .question-edit-bar,
        .preview-form-group:hover .question-edit-bar {
            display: flex !important;
            gap: 4px;
        }
        
        .question-edit-btn {
            padding: 10px;
            background: transparent;
            border: none;
            cursor: pointer;
            color: #5f6368;
            font-size: 15px;
            border-radius: 8px;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
        }
        
        .question-edit-btn:hover {
            background: linear-gradient(135deg, rgba(255, 199, 0, 0.1), rgba(255, 199, 0, 0.05));
            color: var(--dourado-principal, #FFC700);
            transform: scale(1.1);
        }
        
        .question-edit-btn:active {
            transform: scale(0.95);
        }
        
        .question-label-edit {
            font-size: 16px;
            font-weight: 400;
            color: #202124;
            margin: 0 0 16px 0;
            padding: 0;
            border: none;
            border-bottom: 2px dashed transparent;
            cursor: text;
            min-height: 24px;
            outline: none;
            line-height: 1.6;
            display: block;
            width: 100%;
            box-sizing: border-box;
            word-wrap: break-word;
            overflow-wrap: break-word;
            position: relative;
            z-index: 1;
            text-align: left;
        }
        
        .question-label-edit:hover {
            border-bottom-color: #dadce0;
        }
        
        .question-label-edit:focus {
            border-bottom-color: var(--dourado-principal, #FFC700);
            background: transparent;
        }
        
        .question-input-preview {
            width: 100%;
            padding: 8px 0;
            border: none;
            border-bottom: 1px solid #dadce0;
            font-size: 14px;
            color: #202124;
            background: transparent;
            outline: none;
            display: block;
            box-sizing: border-box;
            margin-bottom: 8px;
            text-align: left;
        }
        
        .question-input-preview:focus {
            border-bottom: 2px solid var(--dourado-principal, #FFC700);
            margin-bottom: -1px;
        }
        
        .add-question-placeholder {
            border: none;
            border-top: 2px dashed #dadce0;
            border-radius: 0;
            padding: 32px 24px;
            text-align: center;
            color: #5f6368;
            margin: 0;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            background: white;
            position: relative;
            overflow: hidden;
        }
        
        .add-question-placeholder::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 199, 0, 0.1), transparent);
            transition: left 0.5s;
        }
        
        .add-question-placeholder:hover {
            background: linear-gradient(135deg, #f8f9fa, #f0f0f0);
            border-top-color: var(--dourado-principal, #FFC700);
            border-top-width: 3px;
            color: var(--dourado-principal, #FFC700);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(255, 199, 0, 0.15);
        }
        
        .add-question-placeholder:hover::before {
            left: 100%;
        }
        
        .add-question-placeholder i {
            font-size: 28px;
            margin-bottom: 12px;
            display: block;
            transition: transform 0.3s;
        }
        
        .add-question-placeholder:hover i {
            transform: scale(1.2) rotate(90deg);
        }
        
        /* Tooltips Premium */
        [data-tooltip] {
            position: relative;
        }
        
        [data-tooltip]:hover::after {
            content: attr(data-tooltip);
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            padding: 8px 12px;
            background: linear-gradient(135deg, #1C1C21, #0D0D0F);
            color: #ECECEC;
            font-size: 12px;
            font-weight: 600;
            border-radius: 8px;
            white-space: nowrap;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            margin-bottom: 8px;
            animation: fadeInUp 0.3s ease-out;
            pointer-events: none;
        }
        
        [data-tooltip]:hover::before {
            content: '';
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 6px solid transparent;
            border-top-color: #1C1C21;
            margin-bottom: 2px;
            z-index: 1001;
            pointer-events: none;
        }
        
        /* Loading States */
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            animation: fadeIn 0.3s ease-out;
        }
        
        .loading-spinner {
            width: 60px;
            height: 60px;
            border: 4px solid rgba(255, 199, 0, 0.2);
            border-top-color: var(--dourado-principal, #FFC700);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        /* Success Message */
        .success-message {
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10B981, #059669);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 12px;
            animation: slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            font-weight: 600;
        }
        
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        /* Responsive Improvements */
        @media (max-width: 1024px) {
            .form-edit-sidebar {
                width: 240px;
            }
            
            .form-preview-container {
                max-width: 100%;
                margin: 0 16px;
            }
        }
        
        @media (max-width: 768px) {
            /* Esconder botões de modo de preview (Desktop/Mobile) no mobile físico */
            #preview-mode-desktop,
            #preview-mode-mobile,
            button[id*="preview-mode"],
            button[id="preview-mode-desktop"],
            button[id="preview-mode-mobile"] {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
                width: 0 !important;
                height: 0 !important;
                padding: 0 !important;
                margin: 0 !important;
            }
            
            /* Esconder container dos botões Desktop/Mobile */
            div[style*="display: flex; gap: 8px;"]:has(#preview-mode-desktop),
            div[style*="display: flex; gap: 8px;"]:has(#preview-mode-mobile) {
                display: none !important;
            }
            
            /* Esconder linha separadora ao lado dos botões */
            div[style*="width: 2px"]:has(+ div:has(#preview-mode-desktop)) {
                display: none !important;
            }
            
            /* Esconder título "Pré-visualização" se não tiver mais nada ao lado */
            h3:has-text("Pré-visualização") {
                display: none !important;
            }
            
            /* Esconder toda a barra de controles da pré-visualização no mobile */
            .preview-controls-bar {
                display: none !important;
                visibility: hidden !important;
                height: 0 !important;
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
                overflow: hidden !important;
            }
            
            /* Ajustar container de preview no mobile - SEM ESPA?OS BRANCOS */
            .form-preview-container,
            #form-preview-container-main {
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                border-radius: 0 !important;
                box-shadow: none !important;
            }
            
            .form-edit-preview {
                padding: 0 !important;
                margin: 0 !important;
            }
            
            .preview-form-wrapper,
            #preview-form-wrapper-main {
                margin: 0 !important;
                padding: 0 2px !important;
                max-width: 100% !important;
                width: 100% !important;
                box-sizing: border-box !important;
            }
            
            .digital-form {
                margin: 0 !important;
                padding: 12px 8px !important;
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }
            
            /* Remover qualquer espaço branco lateral */
            .form-edit-sidebar {
                border-right: none !important;
            }
            
            .form-edit-main {
                margin-left: 0 !important;
                padding-left: 0 !important;
            }
            
            .form-edit-header {
                padding: 12px 16px !important;
                flex-wrap: nowrap !important; /* Não quebrar linha */
                gap: 8px !important;
                position: sticky !important; /* Fixo no topo */
                top: 0 !important;
                z-index: 9999 !important; /* Acima do conteúdo mas abaixo do botão salvar se necessário */
                min-height: 50px !important; /* Altura mínima */
                align-items: center !important;
                justify-content: space-between !important; /* Espaço entre elementos */
            }
            
            /* Garantir que o container do botão voltar, título e salvar não seja coberto */
            .form-edit-header {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                gap: 8px !important;
                flex-wrap: nowrap !important;
            }
            
            .form-edit-header > div:first-child {
                display: flex !important;
                align-items: center !important;
                gap: 10px !important;
                flex: 1 !important;
                min-width: 0 !important; /* Permite que o título encolha se necessário */
                overflow: hidden !important; /* Previne overflow */
            }
            
            .form-edit-header h1 {
                font-size: 14px !important; /* Menor no mobile */
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                flex: 1 !important;
                min-width: 0 !important; /* Permite encolher */
                margin: 0 !important;
                max-width: calc(100vw - 160px) !important; /* Espaço para botão voltar + salvar + padding */
            }
            
            /* Botão Voltar visível e acessível */
            .form-edit-header .btn-back {
                flex-shrink: 0 !important; /* Não encolhe */
                padding: 7px 10px !important; /* Tamanho menor no mobile */
                font-size: 12px !important;
                white-space: nowrap !important;
                z-index: 10001 !important; /* Acima do header */
                position: relative !important;
                min-width: 55px !important; /* Largura mínima */
                max-width: 65px !important; /* Largura máxima */
            }
            
            /* Botão de salvar no header ao lado do botão Voltar - MESMO TAMANHO */
            .form-edit-header #save-form-btn {
                position: static !important; /* Não fixo, fica no header */
                display: flex !important; /* Sempre visível no header */
                visibility: visible !important;
                opacity: 1 !important;
                pointer-events: auto !important;
                padding: 7px 10px !important; /* Mesmo tamanho que o botão Voltar */
                font-size: 12px !important; /* Mesmo tamanho que o botão Voltar */
                min-width: 55px !important; /* Largura mínima similar */
                max-width: 65px !important; /* Largura máxima similar */
                height: auto !important;
                border-radius: 8px !important; /* Bordas arredondadas suaves */
                margin: 0 !important;
                gap: 4px !important;
                align-items: center !important;
                justify-content: center !important;
                background: linear-gradient(135deg, #FFC700, #FFD700) !important;
                color: #000 !important;
                border: none !important;
                font-weight: 700 !important;
                cursor: pointer !important;
                white-space: nowrap !important;
                flex-shrink: 0 !important;
                z-index: 10001 !important;
                box-shadow: 0 2px 8px rgba(255, 199, 0, 0.3) !important;
            }
            
            /* Remover qualquer estilo fixo no bottom (não precisa mais) */
            body #save-form-btn {
                position: static !important;
                bottom: auto !important;
                right: auto !important;
            }
            
            .btn-save-form i {
                font-size: 12px !important; /* Mesmo tamanho que o ícone do botão Voltar */
                margin: 0 !important;
                flex-shrink: 0 !important;
            }
            
            .btn-save-form span {
                display: inline-block !important;
                font-weight: 700 !important;
                color: #000 !important;
                white-space: nowrap !important;
                font-size: 12px !important; /* Mesmo tamanho que o texto do botão Voltar */
            }
            
            .form-edit-main {
                flex-direction: column;
                padding-bottom: 90px !important; /* Espaço para o botão fixo */
                overflow: visible !important;
                min-height: 100vh !important;
            }
            
            .form-edit-sidebar {
                width: 100% !important;
                border-right: none;
                border-bottom: 1px solid var(--border-color, #2C2C2F);
                max-height: none !important;
                overflow-y: auto;
                overflow-x: hidden;
                flex-shrink: 0;
            }
            
            .form-edit-preview {
                padding: 8px !important;
                background: linear-gradient(135deg, #1C1C21 0%, #0D0D0F 100%);
                overflow-y: auto !important;
                overflow-x: hidden !important;
                flex: 1 !important;
                min-height: 0 !important;
                width: 100% !important;
                box-sizing: border-box !important;
            }
            
            /* Quando estiver em modo mobile, reduzir ainda mais padding */
            .form-edit-preview:has(.preview-mobile) {
                padding: 4px !important;
            }
            
            .form-preview-container {
                border-radius: 12px;
                max-width: 100% !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
                width: 100% !important;
                box-sizing: border-box !important;
            }
            
            /* FOR?AR ajustes no modo mobile - especificidade máxima - ZERO CORTE */
            .form-preview-container.preview-mobile,
            body .form-preview-container.preview-mobile,
            .form-edit-preview .form-preview-container.preview-mobile,
            html body .form-preview-container.preview-mobile {
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                min-width: 0 !important;
                box-sizing: border-box !important;
                overflow-x: hidden !important;
                overflow-y: auto !important;
                border-radius: 0 !important;
            }
            
            /* FOR?AR wrapper no modo mobile - SEM CORTE */
            .form-preview-container.preview-mobile .preview-form-wrapper,
            body .form-preview-container.preview-mobile .preview-form-wrapper,
            html body .form-preview-container.preview-mobile .preview-form-wrapper {
                max-width: 100% !important;
                width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
                box-sizing: border-box !important;
                overflow-x: hidden !important;
            }
            
            /* FOR?AR digital-form no modo mobile - SEM CORTE */
            .form-preview-container.preview-mobile .digital-form,
            body .form-preview-container.preview-mobile .digital-form,
            html body .form-preview-container.preview-mobile .digital-form {
                max-width: 100% !important;
                width: 100% !important;
                padding: 10px 6px !important;
                margin: 0 !important;
                box-sizing: border-box !important;
                overflow-x: hidden !important;
            }
            
            /* FOR?AR todos os elementos dentro do preview mobile - SEM CORTE */
            .form-preview-container.preview-mobile *,
            body .form-preview-container.preview-mobile * {
                max-width: 100% !important;
                box-sizing: border-box !important;
            }
            
            /* FOR?AR campos no modo mobile - SEM CORTE */
            .form-preview-container.preview-mobile .form-question-item-preview,
            body .form-preview-container.preview-mobile .form-question-item-preview {
                margin: 4px 0 !important;
                padding: 8px 4px 35px 4px !important;
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }
            
            /* FOR?AR botão no modo mobile - SEM CORTE */
            .form-preview-container.preview-mobile .submit-btn,
            body .form-preview-container.preview-mobile .submit-btn {
                width: calc(100% - 8px) !important;
                max-width: calc(100% - 8px) !important;
                margin: 6px 4px !important;
                padding: 12px 14px !important;
                box-sizing: border-box !important;
            }
            
            /* FOR?AR header no modo mobile - SEM CORTE */
            .form-preview-container.preview-mobile .form-header,
            body .form-preview-container.preview-mobile .form-header {
                width: 100% !important;
                max-width: 100% !important;
                padding-left: 0 !important;
                padding-right: 0 !important;
                margin: 0 !important;
                box-sizing: border-box !important;
            }
            
            .form-preview-container.preview-mobile .form-header h1,
            body .form-preview-container.preview-mobile .form-header h1 {
                padding-left: 4px !important;
                padding-right: 4px !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                word-wrap: break-word !important;
            }
            
            /* FOR?AR descrição no modo mobile - SEM CORTE */
            .form-preview-container.preview-mobile .form-description,
            body .form-preview-container.preview-mobile .form-description {
                margin-left: 2px !important;
                margin-right: 2px !important;
                max-width: calc(100% - 4px) !important;
                box-sizing: border-box !important;
            }
            
            .form-preview-title {
                font-size: 24px;
                padding: 24px 16px 8px 16px;
                text-align: left;
            }
            
            .form-preview-description {
                padding: 8px 16px 20px 16px;
                font-size: 13px;
                text-align: left;
            }
            
            .form-question-item-preview {
                margin: 12px 16px;
                padding: 20px 16px 60px 16px; /* Mais padding embaixo para os botões */
                text-align: left;
                position: relative;
            }
            
            /* Ajustar botões de edição no mobile */
            .question-edit-bar {
                position: static !important; /* Mudar de absolute para static no mobile */
                display: flex !important; /* Sempre visível no mobile */
                margin-top: 12px;
                margin-left: -6px; /* Compensar padding do container */
                margin-right: -6px;
                justify-content: flex-start;
                gap: 8px;
                padding: 8px;
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.95);
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .form-question-item-preview:hover .question-edit-bar {
                display: flex !important; /* Forçar display no mobile */
            }
            
            /* Ajustar título da pergunta no mobile para não sobrepor */
            .form-question-item-preview .question-label,
            .form-question-item-preview .question-title,
            .form-question-item-preview label {
                margin-bottom: 10px;
                padding-right: 0 !important; /* Remover padding direito já que botões estão embaixo */
                word-wrap: break-word;
                overflow-wrap: break-word;
                font-size: 14px !important;
                line-height: 1.4;
            }
            
            /* Melhorar campos de input no preview mobile */
            .form-question-item-preview input,
            .form-question-item-preview textarea,
            .form-question-item-preview select {
                padding: 12px 14px !important;
                font-size: 16px !important;
                border-radius: 8px !important;
                width: 100%;
                box-sizing: border-box;
            }
            
            /* Melhorar botões de opção no preview mobile */
            .form-question-item-preview .checkbox-group,
            .form-question-item-preview .radio-group {
                gap: 8px;
            }
            
            .form-question-item-preview .checkbox-group label,
            .form-question-item-preview .radio-group label {
                padding: 10px 12px !important;
                font-size: 14px !important;
                border-radius: 8px !important;
            }
            
            /* Ajustar container de preview no mobile - SEM ESPA?OS BRANCOS */
            .form-preview-container {
                padding: 0 !important;
                margin: 0 !important;
                max-width: 100% !important;
                width: 100% !important;
                border-radius: 0 !important;
                box-shadow: none !important;
            }
            
            /* Garantir que o preview container ocupe toda largura no mobile */
            .form-edit-preview {
                padding: 0 !important;
                margin: 0 !important;
            }
            
            /* Ajustar preview wrapper no mobile - SEM ESPA?OS */
            .preview-form-wrapper {
                margin: 0 !important;
                padding: 0 4px !important;
                max-width: 100% !important;
                width: 100% !important;
                box-sizing: border-box !important;
            }
            
            /* FOR?AR estilos mobile quando estiver em modo mobile - SEM CORTE */
            .form-edit-preview .form-preview-container.preview-mobile,
            .preview-mobile .form-preview-container,
            .form-preview-container.preview-mobile {
                padding: 0 !important;
                margin: 0 !important;
                max-width: 100% !important;
                width: 100% !important;
                min-width: 0 !important;
                overflow-x: hidden !important;
                overflow-y: auto !important;
                box-sizing: border-box !important;
                border-radius: 0 !important;
            }
            
            /* Ajustar preview wrapper quando em modo mobile - SEM CORTE */
            .preview-mobile .preview-form-wrapper,
            .form-preview-container.preview-mobile .preview-form-wrapper {
                max-width: 100% !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 1px !important;
                box-sizing: border-box !important;
                overflow-x: hidden !important;
            }
            
            /* Garantir que o container principal não corte conteúdo */
            .form-edit-preview {
                overflow-x: hidden !important;
                overflow-y: auto !important;
                padding: 2px !important;
            }
            
            /* Quando estiver em modo mobile, reduzir padding ao máximo */
            .form-edit-preview:has(.preview-mobile),
            .form-edit-preview:has(.form-preview-container.preview-mobile) {
                padding: 0 !important;
            }
            
            /* Ajustar header do preview no mobile */
            .form-preview-title {
                font-size: 16px !important;
                padding: 10px 8px 4px 8px !important;
                line-height: 1.3 !important;
            }
            
            .preview-mobile .form-preview-title {
                font-size: 14px !important;
                padding: 8px 6px 4px 6px !important;
            }
            
            .form-preview-description {
                padding: 4px 8px 10px 8px !important;
                font-size: 12px !important;
                line-height: 1.4 !important;
            }
            
            .preview-mobile .form-preview-description {
                font-size: 11px !important;
                padding: 4px 6px 8px 6px !important;
            }
            
            /* Ajustar seção de informações no preview */
            .form-description,
            .form-preview-container .form-description {
                padding: 10px 8px !important;
                margin: 0 8px 10px 8px !important;
                border-radius: 8px !important;
                font-size: 12px !important;
            }
            
            .preview-mobile .form-description {
                padding: 8px 6px !important;
                margin: 0 4px 8px 4px !important;
                font-size: 11px !important;
                max-width: calc(100% - 8px) !important;
                box-sizing: border-box !important;
            }
            
            /* Garantir que header não corte no mobile */
            .preview-mobile .form-header {
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                overflow-x: hidden !important;
                padding-left: 0 !important;
                padding-right: 0 !important;
            }
            
            .preview-mobile .form-header h1 {
                max-width: 100% !important;
                box-sizing: border-box !important;
                overflow-x: hidden !important;
                text-overflow: ellipsis !important;
                white-space: normal !important;
                word-wrap: break-word !important;
                padding-left: 4px !important;
                padding-right: 4px !important;
            }
            
            /* Header do formulário no preview mobile */
            .form-preview-container .form-header,
            .form-preview-container header.form-header {
                padding: 12px 0 !important;
                margin: 0 !important;
            }
            
            .preview-mobile .form-header,
            .preview-mobile header.form-header {
                padding: 10px 0 !important;
            }
            
            .form-preview-container .form-header h1,
            .form-preview-container header.form-header h1 {
                font-size: 16px !important;
                padding: 0 8px !important;
                line-height: 1.3 !important;
            }
            
            .preview-mobile .form-header h1,
            .preview-mobile header.form-header h1 {
                font-size: 14px !important;
                padding: 0 6px !important;
            }
            
            /* Melhorar botão de envio no preview mobile */
            .submit-btn,
            .form-preview-container .submit-btn {
                width: calc(100% - 16px) !important;
                max-width: calc(100% - 16px) !important;
                padding: 12px 18px !important;
                font-size: 14px !important;
                border-radius: 8px !important;
                margin: 10px 8px !important;
                box-sizing: border-box !important;
            }
            
            .preview-mobile .submit-btn,
            .form-preview-container.preview-mobile .submit-btn,
            body .preview-mobile .submit-btn,
            body .form-preview-container.preview-mobile .submit-btn {
                width: calc(100% - 8px) !important;
                max-width: calc(100% - 8px) !important;
                padding: 12px 16px !important;
                font-size: 13px !important;
                margin: 8px 4px !important;
                box-sizing: border-box !important;
            }
            
            /* Garantir que elementos não ultrapassem a largura */
            .preview-mobile * {
                max-width: 100% !important;
                box-sizing: border-box !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
            }
            
            /* Evitar que imagens ou outros elementos quebrem o layout */
            .preview-mobile img {
                max-width: 100% !important;
                height: auto !important;
                display: block !important;
            }
            
            /* Garantir que o container principal não tenha overflow horizontal */
            .preview-mobile,
            .preview-mobile .form-preview-container {
                overflow-x: hidden !important;
                width: 100% !important;
                max-width: 100% !important;
                min-width: 0 !important;
                box-sizing: border-box !important;
            }
            
            /* Garantir que o wrapper não ultrapasse e não corte - REMOVIDO max-width fixo */
            .preview-mobile .preview-form-wrapper,
            .form-preview-container.preview-mobile .preview-form-wrapper,
            body .preview-mobile .preview-form-wrapper,
            body .form-preview-container.preview-mobile .preview-form-wrapper {
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow-x: hidden !important;
            }
            
            /* Garantir que elementos dentro do wrapper não ultrapassem */
            .preview-mobile .preview-form-wrapper > *,
            .form-preview-container.preview-mobile .preview-form-wrapper > *,
            body .preview-mobile .preview-form-wrapper > *,
            body .form-preview-container.preview-mobile .preview-form-wrapper > * {
                max-width: 100% !important;
                box-sizing: border-box !important;
                overflow-x: hidden !important;
            }
            
            /* Ajustar digital-form dentro do preview mobile */
            .preview-mobile .digital-form,
            .form-preview-container.preview-mobile .digital-form,
            body .preview-mobile .digital-form,
            body .form-preview-container.preview-mobile .digital-form {
                max-width: 100% !important;
                width: 100% !important;
                box-sizing: border-box !important;
                padding: 10px 6px !important;
                margin: 0 !important;
            }
            
            /* FOR?AR que container e todos os filhos não tenham overflow horizontal */
            .form-preview-container.preview-mobile,
            .form-preview-container.preview-mobile *,
            body .form-preview-container.preview-mobile,
            body .form-preview-container.preview-mobile * {
                overflow-x: hidden !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }
            
            /* Ajustar campos no preview quando em modo mobile */
            .preview-mobile .form-question-item-preview {
                margin: 6px 4px !important;
                padding: 10px 6px 40px 6px !important;
                width: calc(100% - 8px) !important;
                max-width: calc(100% - 8px) !important;
                box-sizing: border-box !important;
            }
            
            .preview-mobile .form-question-item-preview input,
            .preview-mobile .form-question-item-preview textarea,
            .preview-mobile .form-question-item-preview select {
                padding: 10px 12px !important;
                font-size: 16px !important;
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }
            
            /* Garantir que checkboxes e radios não ultrapassem */
            .preview-mobile .checkbox-group,
            .preview-mobile .radio-group {
                width: 100% !important;
                max-width: 100% !important;
            }
            
            .preview-mobile .checkbox-group label,
            .preview-mobile .radio-group label {
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }
            
            .preview-mobile .checkbox-group label,
            .preview-mobile .radio-group label {
                padding: 8px 10px !important;
                font-size: 12px !important;
                margin-bottom: 6px !important;
            }
            
            /* Ajustar labels no mobile */
            .preview-mobile .form-question-item-preview label {
                font-size: 12px !important;
                margin-bottom: 6px !important;
            }
            
            /* Ajustar espaçamento entre campos no mobile */
            .preview-mobile .form-group {
                margin-bottom: 14px !important;
            }
            
            /* Ajustar preview das perguntas no mobile */
            #preview-questions-container {
                padding: 0 8px;
            }
            
            /* Ajustar form-group no mobile */
            .form-group.preview-form-group {
                margin-bottom: 24px;
                padding: 16px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            }
            
            /* Garantir que o label tenha espaço suficiente */
            .form-group.preview-form-group label {
                padding-right: 60px !important;
                margin-bottom: 12px;
            }
            
            /* Scrollbar personalizada para mobile */
            ::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }
            
            ::-webkit-scrollbar-track {
                background: var(--background-color, #0D0D0F);
            }
            
            ::-webkit-scrollbar-thumb {
                background: var(--border-color, #2C2C2F);
                border-radius: 4px;
            }
            
            ::-webkit-scrollbar-thumb:hover {
                background: var(--dourado-principal, #FFC700);
            }
        }
    </style>
    @vite(['resources/js/pages/formPageEdit.js'])
</head>
<body class="form-edit-page form-edit-page-body">
    <div class="form-edit-header">
        <div style="display: flex; align-items: center; gap: 16px;">
            <a href="/kingForms" target="_top" class="btn-back">
                <i class="fas fa-arrow-left"></i> Voltar
            </a>
            <h1>Editar King Forms</h1>
        </div>
        <button class="btn-save-form" id="save-form-btn">
            <i class="fas fa-save"></i> Salvar
        </button>
    </div>
    
    <div class="form-edit-main">
        <!-- Sidebar -->
        <div class="form-edit-sidebar">
            <div class="sidebar-section">
                <div class="sidebar-section-title">Adicionar Elementos</div>
                
                <!-- Busca de Perguntas -->
                <div style="padding: 0 16px 12px 16px;">
                    <div style="position: relative;">
                        <input type="text" id="search-questions-input" placeholder="Buscar perguntas..." style="width: 100%; padding: 10px 36px 10px 12px; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1); border-radius: 8px; color: #ECECEC; font-size: 14px; transition: all 0.3s;" onfocus="this.style.borderColor='#FFC700'; this.style.background='rgba(255,199,0,0.1)';" onblur="this.style.borderColor='rgba(255,255,255,0.1)'; this.style.background='rgba(255,255,255,0.05)';">
                        <button id="clear-search-btn" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: transparent; border: none; color: #A1A1A1; cursor: pointer; padding: 4px; display: none; font-size: 14px;" title="Limpar busca">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                <button class="sidebar-btn" id="sidebar-add-question">
                    <i class="fas fa-plus-circle"></i>
                    <span>Adicionar pergunta</span>
                </button>
                <button class="sidebar-btn" id="sidebar-add-title">
                    <i class="fas fa-heading"></i>
                    <span>Adicionar título e descrição</span>
                </button>
                <button class="sidebar-btn" id="sidebar-add-header-image">
                    <i class="fas fa-image"></i>
                    <span>Adicionar imagem de cabeçalho</span>
                </button>
                <button class="sidebar-btn" id="sidebar-add-image">
                    <i class="fas fa-image"></i>
                    <span>Adicionar imagem</span>
                </button>
                <button class="sidebar-btn" id="sidebar-customize-colors">
                    <i class="fas fa-palette"></i>
                    <span>Cores e Temas</span>
                </button>
                <button class="sidebar-btn" id="sidebar-load-module">
                    <i class="fas fa-layer-group"></i>
                    <span>Módulos/Templates</span>
                </button>
                <button class="sidebar-btn" id="sidebar-settings">
                    <i class="fas fa-cog"></i>
                    <span>Configurações</span>
                </button>
                <button class="sidebar-btn" id="sidebar-responses">
                    <i class="fas fa-inbox"></i>
                    <span>Envios | Listas</span>
                </button>
                <button class="sidebar-btn" id="sidebar-dashboard">
                    <i class="fas fa-chart-bar"></i>
                    <span>Dashboard</span>
                </button>
            </div>
            <div class="sidebar-section">
                <div class="sidebar-section-title">Compartilhar</div>
                <button class="sidebar-btn" id="sidebar-share-form-ready" title="Gera um código para outro usuário importar este formulário na conta dele">
                    <i class="fas fa-share-alt"></i>
                    <span>Gerar código</span>
                </button>
                <button class="sidebar-btn" id="sidebar-import-form" title="Importar um formulário: digite o código que alguém te passou">
                    <i class="fas fa-file-import"></i>
                    <span>Importar formulário</span>
                </button>
            </div>
            
        </div>
        
        <!-- Preview Area -->
        <div class="form-edit-preview" style="display: flex; flex-direction: column; height: 100%; overflow-y: auto; overflow-x: hidden;">
            <!-- Barra de Controles da Pré-visualização -->
            <div class="preview-controls-bar" style="position: sticky; top: 0; z-index: 1000; background: linear-gradient(135deg, #1C1C21 0%, #0D0D0F 100%); padding: 16px 24px; border-bottom: 2px solid rgba(255,199,0,0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <h3 style="margin: 0; color: #ECECEC; font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-eye" style="color: #FFC700;"></i>
                        Pré-visualização
                    </h3>
                    <div class="preview-separator" style="width: 2px; height: 24px; background: rgba(255,255,255,0.1);"></div>
                    <div class="preview-mode-buttons" style="display: flex; gap: 8px;">
                        <button id="preview-mode-desktop" class="preview-mode-btn active" style="padding: 8px 16px; background: linear-gradient(135deg, rgba(255,199,0,0.2), rgba(255,199,0,0.1)); border: 2px solid #FFC700; border-radius: 8px; color: #FFC700; font-weight: 600; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; gap: 8px;" onmouseover="this.style.transform='scale(1.05)';" onmouseout="this.style.transform='scale(1)';">
                            <i class="fas fa-desktop"></i>
                            Desktop
                        </button>
                        <button id="preview-mode-mobile" class="preview-mode-btn" style="padding: 8px 16px; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1); border-radius: 8px; color: #A1A1A1; font-weight: 600; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; gap: 8px;" onmouseover="this.style.borderColor='rgba(255,199,0,0.3)'; this.style.color='#FFC700';" onmouseout="this.style.borderColor='rgba(255,255,255,0.1)'; this.style.color='#A1A1A1';">
                            <i class="fas fa-mobile-alt"></i>
                            Celular
                        </button>
                    </div>
                </div>
                <div style="font-size: 12px; color: #A1A1A1;">
                    <i class="fas fa-info-circle"></i>
                    Visualização idêntica ao formulário público
                </div>
            </div>
            <div class="form-preview-container" style="flex: 1; overflow-y: auto; overflow-x: hidden; padding: 24px; background: #f8f9fa; min-height: 100%; display: block !important; visibility: visible !important; opacity: 1 !important;">
                <!-- Estrutura idêntica ao formulário público -->
                <div class="preview-form-wrapper" style="max-width: 1000px; margin: 0 auto;">
                    <!-- Header Image -->
                    <div id="preview-header-image-container" style="display: none; position: relative; width: 100%; overflow: hidden; margin-bottom: 0; line-height: 0; background: #0a0a0a;">
                        <img id="preview-header-image" style="width: 100%; height: auto; max-width: 100%; object-fit: contain; object-position: center center; display: block;">
                        <button id="remove-header-image-preview" style="position: absolute; top: 16px; right: 16px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 36px; height: 36px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; z-index: 10;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <!-- Header (simulado) -->
                    <header class="preview-form-header" style="background: linear-gradient(135deg, var(--preview-primary-color, #4A90E2) 0%, rgba(74, 144, 226, 0.9) 100%); color: white; padding: 24px; border-radius: 0; box-shadow: 0 2px 16px rgba(0,0,0,0.12); margin-bottom: 0;">
                        <div style="display: flex; align-items: center; gap: 20px;">
                            <h1 class="preview-form-title" contenteditable="true" id="preview-title" data-placeholder="Formulário sem título" style="margin: 0; font-size: 32px; font-weight: 700; flex: 1; letter-spacing: -0.5px; line-height: 1.2; color: white; word-wrap: break-word; overflow-wrap: break-word;">Formulário sem título</h1>
                        </div>
                    </header>
                    
                    <!-- Main Content - Layout do formulário (preview) -->
                    <main class="preview-form-container" style="padding: 40px 0 80px 0; position: relative; z-index: 5; min-height: calc(100vh - 200px);">
                        <div class="preview-container" style="max-width: 1000px; margin: 0 auto; padding: 0 24px;">
                            <div class="preview-checkout-layout" style="display: grid; grid-template-columns: 1fr; gap: 32px; align-items: start;">
                                <!-- Coluna Principal - Formulário -->
                                <div class="preview-checkout-main">
                                    <!-- Descrição -->
                                    <div id="preview-description-container" style="display: none; background: var(--preview-card-color, #ffffff); padding: 32px 40px; border-radius: 20px; margin-bottom: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid rgba(0,0,0,0.06); position: relative;">
                                        <button id="remove-description-btn" style="position: absolute; top: 16px; right: 16px; background: rgba(0,0,0,0.05); border: none; color: #5f6368; cursor: pointer; padding: 8px 12px; font-size: 14px; border-radius: 8px; opacity: 0.6; transition: opacity 0.2s; display: none;" title="Remover descrição" onmouseover="this.style.opacity='1'; this.style.background='rgba(0,0,0,0.1)';" onmouseout="this.style.opacity='0.6'; this.style.background='rgba(0,0,0,0.05)';">
                                            <i class="fas fa-times"></i>
                                        </button>
                                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                                            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, var(--preview-primary-color, #4A90E2), rgba(74, 144, 226, 0.7)); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px;">
                                                <i class="fas fa-info-circle"></i>
                                            </div>
                                            <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: var(--preview-text-color, #202124);">Informações</h2>
                                        </div>
                                        <p class="preview-form-description" contenteditable="true" id="preview-description" data-placeholder="Descrição do formulário" style="margin: 0; padding-left: 52px; line-height: 1.9; color: var(--preview-text-color, #333); font-size: 16px; font-weight: 400; letter-spacing: 0.2px; word-wrap: break-word; overflow-wrap: break-word;">Descrição do formulário</p>
                                    </div>

                                    <!-- Formulário -->
                                    <form class="preview-digital-form" style="background: var(--preview-card-color, white); padding: 48px 56px; border-radius: 24px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); border: 1px solid rgba(0,0,0,0.06); position: relative; overflow: hidden;">
                                        <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--preview-primary-color, #4A90E2), rgba(74, 144, 226, 0.6));"></div>
                                        
                                        <div style="margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #e8eaed;">
                                            <h2 style="margin: 0; font-size: 24px; font-weight: 800; color: var(--preview-text-color, #202124); letter-spacing: -0.5px; display: flex; align-items: center; gap: 12px;">
                                                <div style="width: 6px; height: 32px; background: linear-gradient(180deg, var(--preview-primary-color, #4A90E2), rgba(74, 144, 226, 0.6)); border-radius: 3px;"></div>
                                                Preencha os dados
                                            </h2>
                                            <p style="margin: 12px 0 0 18px; color: #5f6368; font-size: 14px;">Todos os campos marcados com * são obrigatórios</p>
                                        </div>
                                        
                                        <!-- Campos Dinâmicos -->
                                        <div id="preview-questions-container" style="min-height: 200px;">
                                            <div class="add-question-placeholder" id="add-question-placeholder">
                                                <i class="fas fa-plus-circle"></i>
                                                <div>Adicione a primeira pergunta</div>
                                            </div>
                                        </div>
                                        
                                        <!-- Botão Enviar -->
                                        <button type="button" class="preview-submit-btn" style="width: 100%; padding: 16px 24px; background: linear-gradient(135deg, #25D366, #20BA5A); color: white; border: none; border-radius: 14px; font-weight: 700; font-size: 16px; cursor: default; margin-top: 32px; display: flex; align-items: center; justify-content: center; gap: 12px; box-shadow: 0 4px 16px rgba(37, 211, 102, 0.3);">
                                            <i class="fab fa-whatsapp" style="font-size: 20px;"></i>
                                            <span>Enviar via WhatsApp</span>
                                            <i class="fas fa-arrow-right" style="font-size: 14px; margin-left: auto;"></i>
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
        
        <!-- Campos hidden para configurações (usados pelo código JS) -->
        <div style="display: none;">
            <input type="text" id="form-module-title" placeholder="King Forms">
            <input type="text" id="form-title" placeholder="Ex: Formulário de Contato">
            <textarea id="form-description" rows="4" placeholder="Descreva o propósito do formulário..."></textarea>
            <input type="text" id="whatsapp-number" placeholder="5511999999999">
            <input type="hidden" id="enable-pastor-button" value="false">
            <input type="hidden" id="pastor-whatsapp-number" value="">
            <input type="hidden" id="pastor-button-name" value="Enviar Mensagem para o Pastor">
            <input type="hidden" id="show-logo-corner" value="false">
            <input type="hidden" id="logo-url">
            <input type="hidden" id="button-logo-url">
            <input type="hidden" id="button-logo-size" value="40">
            <input type="hidden" id="banner-image-url">
            <input type="hidden" id="header-image-url">
            <input type="hidden" id="background-image-url">
            <input type="hidden" id="background-color-url" value="#FFFFFF">
            <input type="hidden" id="card-color" value="#FFFFFF">
            <input type="range" id="background-opacity" min="0" max="1" step="0.1" value="1">
            <select id="form-theme">
                <option value="light">Claro</option>
                <option value="dark">Escuro</option>
            </select>
            <input type="color" id="primary-color" value="#4A90E2">
            <input type="color" id="text-color" value="#333333">
            <input type="color" id="secondary-color" value="#6BA3F0">
            <label>
                <input type="radio" name="display-format" value="button" checked>
            </label>
            <label>
                <input type="radio" name="display-format" value="banner">
            </label>
            <div id="banner-image-container" style="display: none;"></div>
            <input type="hidden" id="form-fields-json" value="[]">
            
            <!-- Elementos de upload (ocultos mas acessíveis pelo JS) -->
            <div id="banner-upload-area" style="position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden;">
                <input type="file" id="banner-file-input" accept="image/*">
                <img id="banner-preview">
                <div id="banner-upload-text"></div>
                <button type="button" id="remove-banner-btn"></button>
            </div>
            <div id="logo-upload-area" style="position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden;">
                <input type="file" id="logo-file-input" accept="image/png,image/jpeg,image/jpg">
                <img id="logo-preview">
                <div id="logo-upload-text"></div>
                <button type="button" id="remove-logo-btn"></button>
            </div>
            <div id="header-upload-area" style="position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden;">
                <input type="file" id="header-file-input" accept="image/*">
                <img id="header-preview">
                <div id="header-upload-text"></div>
                <button type="button" id="remove-header-btn"></button>
            </div>
            <div id="background-upload-area" style="position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden;">
                <input type="file" id="background-file-input" accept="image/*">
                <img id="background-preview">
                <div id="background-upload-text"></div>
                <button type="button" id="remove-background-btn"></button>
            </div>
        </div>
        
        <!-- Outras tabs (ocultas por enquanto) -->
        <div style="display: none;">
            <div class="form-tab-content" data-tab-content="questions">
            <div style="margin-bottom: 20px;">
                <button type="button" class="btn-save-form" id="add-question-btn">
                    <i class="fas fa-plus"></i> Adicionar Pergunta
                </button>
            </div>
            <div id="questions-container">
                <div style="text-align: center; padding: 40px; color: var(--text-dark, #A1A1A1);">
                    <i class="fas fa-question-circle" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.3;"></i>
                    <p>Nenhuma pergunta adicionada ainda.</p>
                    <p style="font-size: 0.9rem; margin-top: 10px;">Clique em "Adicionar Pergunta" para começar.</p>
                </div>
            </div>
            <input type="hidden" id="form-fields-json">
        </div>
        
        <div class="form-tab-content" data-tab-content="responses">
            <div id="responses-dashboard">
                <div style="text-align: center; padding: 40px; color: var(--text-dark, #A1A1A1);">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 15px;"></i>
                    <p>Carregando respostas...</p>
                </div>
            </div>
        </div>
    </div>
    
</body>
</html>

