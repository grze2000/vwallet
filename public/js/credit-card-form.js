$(function() {
    $("#card").inputmask("9999-9999-9999-9999");
    $('#expirationDate').inputmask("Regex", {regex: "0[1-9]|1[0-2]/[0-9]{2}"});
    $("#cvv").inputmask("999");

    $('#card').on('input', function() {
        var cardTypes = {'4': 'Visa', '5': 'MasterCard', '6': 'Discover Card'};
        if(Object.keys(cardTypes).includes($(this).val().charAt(0))) {
            $("#card-type").text(cardTypes[$(this).val().charAt(0)]);
        } else {
            $("#card-type").text("");
        }
    });
});