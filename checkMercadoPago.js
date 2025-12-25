
try {
    console.log('--- Iniciando Diagnóstico do SDK Mercado Pago ---');
    
    const mercadopagoModule = require('mercadopago');

    console.log('\n1. O que é o módulo principal?');
    console.log('   - typeof mercadopagoModule:', typeof mercadopagoModule);
    console.log('   - É uma função?', mercadopagoModule instanceof Function);
    console.log('   - É um objeto?', mercadopagoModule instanceof Object);

    console.log('\n2. Quais são as chaves/propriedades disponíveis?');
    console.log(Object.keys(mercadopagoModule));

    console.log('\n3. Verificando as classes que tentamos usar:');
    console.log('   - typeof mercadopagoModule.MercadoPago:', typeof mercadopagoModule.MercadoPago);
    console.log('   - typeof mercadopagoModule.MercadoPagoConfig:', typeof mercadopagoModule.MercadoPagoConfig);
    console.log('   - typeof mercadopagoModule.Preapproval:', typeof mercadopagoModule.Preapproval);
    
    console.log('\n--- Fim do Diagnóstico ---');

} catch (error) {
    console.error('Ocorreu um erro ao tentar diagnosticar o SDK:', error);
}