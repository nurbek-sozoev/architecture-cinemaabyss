pipeline {
    agent any
    
    environment {
        DOCKER_REGISTRY = 'localhost:5000'
        PROJECT_NAME = 'cinemaabyss'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Build Images') {
            parallel {
                stage('Build Monolith') {
                    steps {
                        dir('src/monolith') {
                            script {
                                sh 'docker build -t ${DOCKER_REGISTRY}/${PROJECT_NAME}-monolith:${BUILD_NUMBER} .'
                                sh 'docker build -t ${DOCKER_REGISTRY}/${PROJECT_NAME}-monolith:latest .'
                            }
                        }
                    }
                }
                
                stage('Build Movies Service') {
                    steps {
                        dir('src/microservices/movies') {
                            script {
                                sh 'docker build -t ${DOCKER_REGISTRY}/${PROJECT_NAME}-movies:${BUILD_NUMBER} .'
                                sh 'docker build -t ${DOCKER_REGISTRY}/${PROJECT_NAME}-movies:latest .'
                            }
                        }
                    }
                }
                
                stage('Build Events Service') {
                    when {
                        expression { fileExists('src/microservices/events/Dockerfile') }
                    }
                    steps {
                        dir('src/microservices/events') {
                            script {
                                sh 'docker build -t ${DOCKER_REGISTRY}/${PROJECT_NAME}-events:${BUILD_NUMBER} .'
                                sh 'docker build -t ${DOCKER_REGISTRY}/${PROJECT_NAME}-events:latest .'
                            }
                        }
                    }
                }
                
                stage('Build Proxy Service') {
                    when {
                        expression { fileExists('src/microservices/proxy/Dockerfile') }
                    }
                    steps {
                        dir('src/microservices/proxy') {
                            script {
                                sh 'docker build -t ${DOCKER_REGISTRY}/${PROJECT_NAME}-proxy:${BUILD_NUMBER} .'
                                sh 'docker build -t ${DOCKER_REGISTRY}/${PROJECT_NAME}-proxy:latest .'
                            }
                        }
                    }
                }
            }
        }
        
        stage('Test') {
            steps {
                script {
                    // Запуск тестовых контейнеров
                    sh 'docker-compose -f docker-compose.yml up -d postgres kafka zookeeper'
                    
                    // Ждем готовности базы данных
                    sh 'sleep 30'
                    
                    // Запуск тестов (если есть)
                    if (fileExists('tests/postman/run-tests.sh')) {
                        dir('tests/postman') {
                            sh 'chmod +x run-tests.sh'
                            sh './run-tests.sh'
                        }
                    }
                }
            }
            post {
                always {
                    // Остановка тестовых контейнеров
                    sh 'docker-compose -f docker-compose.yml down'
                }
            }
        }
        
        stage('Push Images') {
            when {
                branch 'main'
            }
            steps {
                script {
                    // Пуш образов в реестр (если настроен)
                    sh 'docker push ${DOCKER_REGISTRY}/${PROJECT_NAME}-monolith:${BUILD_NUMBER}'
                    sh 'docker push ${DOCKER_REGISTRY}/${PROJECT_NAME}-monolith:latest'
                    sh 'docker push ${DOCKER_REGISTRY}/${PROJECT_NAME}-movies:${BUILD_NUMBER}'
                    sh 'docker push ${DOCKER_REGISTRY}/${PROJECT_NAME}-movies:latest'
                    
                    if (fileExists('src/microservices/events/Dockerfile')) {
                        sh 'docker push ${DOCKER_REGISTRY}/${PROJECT_NAME}-events:${BUILD_NUMBER}'
                        sh 'docker push ${DOCKER_REGISTRY}/${PROJECT_NAME}-events:latest'
                    }
                    
                    if (fileExists('src/microservices/proxy/Dockerfile')) {
                        sh 'docker push ${DOCKER_REGISTRY}/${PROJECT_NAME}-proxy:${BUILD_NUMBER}'
                        sh 'docker push ${DOCKER_REGISTRY}/${PROJECT_NAME}-proxy:latest'
                    }
                }
            }
        }
        
        stage('Deploy to Staging') {
            when {
                branch 'main'
            }
            steps {
                script {
                    // Обновление версий в docker-compose или Kubernetes манифестах
                    sh '''
                        sed -i "s/cinemaabyss-monolith:latest/cinemaabyss-monolith:${BUILD_NUMBER}/g" docker-compose.yml
                        sed -i "s/cinemaabyss-movies:latest/cinemaabyss-movies:${BUILD_NUMBER}/g" docker-compose.yml
                    '''
                    
                    // Деплой в staging окружение
                    sh 'docker-compose up -d'
                }
            }
        }
    }
    
    post {
        always {
            // Очистка Docker образов для экономии места
            sh 'docker system prune -f'
        }
        
        success {
            echo 'Pipeline успешно завершен!'
        }
        
        failure {
            echo 'Pipeline завершился с ошибкой!'
            // Отправка уведомлений при необходимости
        }
    }
}
