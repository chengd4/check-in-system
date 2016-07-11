appLogin.controller("loginController", ['$scope','$http', '$state', 'CheckInService', 'updateNameService', function($scope, $http, $state, CheckInService, updateNameService){
    $scope.user;
    $scope.name = updateNameService.get();

    $scope.loginUser = function(){

            $http.post("/users/checkin", {
                studentId: $scope.checkin
            }).success(function(data){
                // data is json get back from the server
                if(data.status == 200){
                    //Set name to reflect on confirmation page and go there
                    updateNameService.set(data.token);
                    $state.go('CheckInConfirmation');
                }else if(data.status == 202){
                    alert(data.message);
                    window.location.href='#/home';
                } else {
                    alert("Student ID does not exist!");
                }
            });
        //}
    };

    $scope.loginAdmin = function(){
        $http.post("/admins/login",{
            adminID: $scope.adminID,
            adminPass : $scope.adminPass
        }).success(function(response){
            if(response.status == 200){
                //Set name to reflect on confirmation page and go there
                CheckInService.saveToken(response.token);
                $state.go('adminView');
            }else{
                alert("Admin ID or Password is incorrect. Please try again.");
            }

        });
    };

    $scope.logoutUser = function(){


            $http.post("/users/checkout", {
                studentId: $scope.checkout
            }).success(function(data){
                if(data.status == 200) {
                    //Set name to reflect on confirmation page and go there
                    updateNameService.set(data.token);
                    $state.go('CheckOutConfirmation');
                }else if( data.status == 201){
                    alert(data.message);
                    window.location.href='#/home';
                }
                else{
                    alert("Student ID does not exist!");
                }
            });
    }
}]);
