import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ImageBackground,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Api from './src/services/api';

const climaImagens = {
  'clear sky': require('./assets/clear-sky.jpg'),
  'few clouds': require('./assets/few-clouds.jpg'),
  'scattered clouds': require('./assets/scattered-clouds.jpg'),
  'broken clouds': require('./assets/broken-clouds.jpg'),
  'shower rain': require('./assets/shower-rain.png'),
  rain: require('./assets/rain.jpg'),
  thunderstorm: require('./assets/thunderstorm.jpg'),
  snow: require('./assets/snow.jpg'),
  mist: require('./assets/mist.jpg'),
  cloudy: require('./assets/cloudy.jpg'),
};

const API_KEY_OPENWEATHER = '439c15b3644737ea659ef68d2776b225';

export default function App() {
  const [cep, setCep] = useState('');
  const [uf, setUf] = useState('');
  const [localidade, setLocalidade] = useState('');
  const [bairro, setBairro] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [ddd, setDdd] = useState('');
  const [historico, setHistorico] = useState([]);

  useEffect(() => {
    carregarHistorico();
  }, []);

  const carregarHistorico = async () => {
    try {
      const jsonHistorico = await AsyncStorage.getItem('historico_buscas');
      if (jsonHistorico !== null) {
        setHistorico(JSON.parse(jsonHistorico));
      }
    } catch (error) {
      console.log('Erro ao carregar histórico', error);
    }
  };

  const salvarNoHistorico = async (dados) => {
    try {
      const novoHistorico = [...historico, ...dados];
      setHistorico(novoHistorico);
      await AsyncStorage.setItem(
        'historico_buscas',
        JSON.stringify(novoHistorico)
      );
    } catch (error) {
      console.log('Erro ao salvar no histórico', error);
    }
  };

  async function buscarClima(cidade, uf) {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${cidade},${uf},BR&appid=${API_KEY_OPENWEATHER}&units=metric&lang=pt`
      );
      const dadosClima = await response.json();

      if (dadosClima.cod !== 200) {
        Alert.alert('Erro ao buscar o clima');
        return null;
      }

      return {
        temperatura: dadosClima.main.temp,
        descricao: dadosClima.weather[0].description,
        umidade: dadosClima.main.humidity,
        vento: dadosClima.wind.speed,
      };
    } catch (error) {
      Alert.alert('Erro ao buscar o clima');
      console.log('ERRO', error);
      return null;
    }
  }

  async function buscarCep() {
    if (cep === '') {
      Alert.alert('Digite um CEP');
      return;
    }

    try {
      const response = await Api.get(`/${cep}/json/`);

      if (response.data.erro) {
        Alert.alert('CEP não encontrado!');
        return;
      }

      const dadosEndereco = {
        cep: cep,
        uf: response.data.uf,
        localidade: response.data.localidade,
        bairro: response.data.bairro,
        logradouro: response.data.logradouro,
        ddd: response.data.ddd,
      };

      setUf(dadosEndereco.uf);
      setLocalidade(dadosEndereco.localidade);
      setBairro(dadosEndereco.bairro);
      setLogradouro(dadosEndereco.logradouro);
      setDdd(dadosEndereco.ddd);

      const climaAtual = await buscarClima(
        dadosEndereco.localidade,
        dadosEndereco.uf
      );

      const dadosCompletos = { ...dadosEndereco, clima: climaAtual };

      // Salva no histórico
      setHistorico((prev) => [...prev, dadosCompletos]);
      await AsyncStorage.setItem(
        'historico_buscas',
        JSON.stringify([...historico, dadosCompletos])
      );
    } catch (error) {
      Alert.alert('Erro ao buscar o endereço');
      console.log('ERRO', error);
    }
  }

  async function buscarCepPorEndereco() {
    if (uf === '' || localidade === '' || logradouro === '') {
      Alert.alert('Preencha todos os campos (UF, Cidade e Logradouro)');
      return;
    }

    try {
      const response = await Api.get(
        `/${uf}/${localidade}/${logradouro}/json/`
      );

      if (response.data.length === 0) {
        Alert.alert('Endereço não encontrado!');
        return;
      }

      const climaAtual = await buscarClima(localidade, uf);

      const dadosCompletos = response.data.map((item) => ({
        ...item,
        clima: climaAtual,
      }));

      // Evitar duplicações
      const novoHistorico = [...historico];
      dadosCompletos.forEach((item) => {
        const existe = novoHistorico.some(
          (h) => h.cep === item.cep && h.logradouro === item.logradouro
        );
        if (!existe) {
          novoHistorico.push(item);
        }
      });

      setHistorico(novoHistorico);
      await AsyncStorage.setItem(
        'historico_buscas',
        JSON.stringify(novoHistorico)
      );
    } catch (error) {
      Alert.alert('Erro ao buscar o CEP');
      console.log('ERRO', error);
    }
  }

  const limparHistorico = async () => {
    try {
      await AsyncStorage.removeItem('historico_buscas');
      setHistorico([]);
      Alert.alert('Histórico de buscas limpo!');
    } catch (error) {
      console.log('Erro ao limpar histórico', error);
    }
  };

  const obterImagemClima = (descricaoClima) => {
    if (descricaoClima && climaImagens[descricaoClima]) {
      return climaImagens[descricaoClima];
    } else {
      return require('./assets/default.jpg');
    }
  };

  const ultimaBusca = historico.length > 0 ? historico[historico.length - 1] : null;

  return (
    <KeyboardAvoidingView style={styles.containerPrincipal} behavior="padding">
      <ScrollView style={styles.containerCaixas}>
        <View style={styles.header}>
          <Text style={styles.titulo}>Pesquisar CEP ou Endereço</Text>
        </View>

        {/* Busca por CEP */}
        <Text style={styles.subTitulo}>Busca por CEP:</Text>
        <TextInput
          style={styles.caixasTexto}
          value={cep}
          onChangeText={(texto) => setCep(texto)}
          placeholder="CEP"
        />
        <TouchableOpacity style={styles.botaoPesquisar} onPress={buscarCep}>
          <Text style={styles.textoBotaoPesquisar}>Pesquisar Endereço</Text>
        </TouchableOpacity>

        {/* Resultado principal: apenas última busca */}
        {ultimaBusca && (
          <View style={styles.resultadoContainer}>
            <ImageBackground
              source={obterImagemClima(ultimaBusca.clima?.descricao)}
              style={styles.resultadoBackground}
              imageStyle={styles.backgroundImage}>
              <View style={styles.itemConteudo}>
                <Text style={styles.resultadoTitulo}>Informações do Endereço:</Text>
                <Text>CEP: {ultimaBusca.cep}</Text>
                <Text>Estado: {ultimaBusca.uf}</Text>
                <Text>Cidade: {ultimaBusca.localidade}</Text>
                <Text>Bairro: {ultimaBusca.bairro}</Text>
                <Text>Logradouro: {ultimaBusca.logradouro}</Text>
                <Text>DDD: {ultimaBusca.ddd}</Text>

                {ultimaBusca.clima && (
                  <>
                    <Text style={styles.resultadoTitulo}>Condições Climáticas:</Text>
                    <Text>Temperatura: {ultimaBusca.clima.temperatura}°C</Text>
                    <Text>Descrição: {ultimaBusca.clima.descricao}</Text>
                    <Text>Umidade: {ultimaBusca.clima.umidade}%</Text>
                    <Text>Vento: {ultimaBusca.clima.vento} m/s</Text>
                  </>
                )}
              </View>
            </ImageBackground>
          </View>
        )}

        {/* Busca por Endereço */}
        <Text style={styles.subTitulo}>Busca por Endereço:</Text>
        <TextInput
          style={styles.caixasTexto}
          value={uf}
          onChangeText={(texto) => setUf(texto)}
          placeholder="Estado (UF)"
        />
        <TextInput
          style={styles.caixasTexto}
          value={localidade}
          onChangeText={(texto) => setLocalidade(texto)}
          placeholder="Cidade"
        />
        <TextInput
          style={styles.caixasTexto}
          value={logradouro}
          onChangeText={(texto) => setLogradouro(texto)}
          placeholder="Logradouro"
        />
        <TouchableOpacity
          style={styles.botaoPesquisar}
          onPress={buscarCepPorEndereco}>
          <Text style={styles.textoBotaoPesquisar}>Pesquisar CEP</Text>
        </TouchableOpacity>

        {/* Histórico */}
        <View style={styles.historicoContainer}>
          <Text style={styles.historicoTitulo}>Histórico de Buscas:</Text>
          {historico.map((item, index) => (
            <ImageBackground
              key={index}
              source={obterImagemClima(item.clima?.descricao)}
              style={styles.historicoItem}
              imageStyle={styles.backgroundImage}>
              <View style={styles.itemConteudo}>
                <Text style={styles.resultadoTitulo}>Informações do Endereço:</Text>
                <Text>CEP: {item.cep}</Text>
                <Text>Estado: {item.uf}</Text>
                <Text>Cidade: {item.localidade}</Text>
                <Text>Bairro: {item.bairro}</Text>
                <Text>Logradouro: {item.logradouro}</Text>
                <Text>DDD: {item.ddd}</Text>

                {item.clima && (
                  <>
                    <Text style={styles.resultadoTitulo}>Condições Climáticas:</Text>
                    <Text>Temperatura: {item.clima.temperatura}°C</Text>
                    <Text>Descrição: {item.clima.descricao}</Text>
                    <Text>Umidade: {item.clima.umidade}%</Text>
                    <Text>Vento: {item.clima.vento} m/s</Text>
                  </>
                )}
              </View>
            </ImageBackground>
          ))}
        </View>

        <TouchableOpacity
          style={styles.botaoLimparHistorico}
          onPress={limparHistorico}>
          <Text style={styles.textoBotaoLimparHistorico}>Limpar Histórico</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  containerPrincipal: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  containerCaixas: {
    marginBottom: 20,
  },
  subTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  caixasTexto: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  botaoPesquisar: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 15,
  },
  textoBotaoPesquisar: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultadoContainer: {
    padding: 10,
    marginTop: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  resultadoBackground: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 10,
  },
  backgroundImage: {
    resizeMode: 'cover',
  },
  itemConteudo: {
    padding: 15,
    flexShrink: 1,
  },
  historicoContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  historicoTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  historicoItem: {
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  botaoLimparHistorico: {
    backgroundColor: '#FF5733',
    padding: 10,
    marginTop: 20,
    borderRadius: 5,
    alignItems: 'center',
  },
  textoBotaoLimparHistorico: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
